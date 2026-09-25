let phrases = [];
let progress = {};
let currentCat = "All";
let idx = 0;

async function init(){
  const [pRes, gRes] = await Promise.all([fetch('/api/phrases'), fetch('/api/progress')]);
  phrases = await pRes.json();
  progress = await gRes.json();
  renderCats();
  renderCard();
  renderSummary();
}

function categories(){
  return ["All", ...new Set(phrases.map(p=>p.cat))];
}

function filtered(){
  return currentCat==="All" ? phrases : phrases.filter(p=>p.cat===currentCat);
}

function renderCats(){
  const el=document.getElementById('cats');
  el.innerHTML='';
  categories().forEach(c=>{
    const b=document.createElement('button');
    b.className='cat-btn'+(c===currentCat?' active':'');
    b.textContent=c;
    b.onclick=()=>{currentCat=c;idx=0;renderCats();renderCard();};
    el.appendChild(b);
  });
}

function renderSummary(){
  const total=phrases.length;
  const mastered=phrases.filter(p=>progress[p.id]&&progress[p.id].mastered).length;
  document.getElementById('summary').textContent=`${mastered} of ${total} mastered`;
}

function renderCard(){
  const list=filtered();
  if(idx>=list.length) idx=0;
  if(idx<0) idx=list.length-1;
  const p=list[idx];
  const e=progress[p.id]||{mastered:false,attempts:0,correct:0,last:null};
  document.getElementById('tag').textContent=p.cat;
  document.getElementById('en').textContent=p.en;
  document.getElementById('romaji').textContent=p.romaji;
  document.getElementById('counter').textContent=(idx+1)+' of '+list.length;
  const star=document.getElementById('masteredBtn');
  star.textContent=e.mastered?'★':'☆';
  star.classList.toggle('on', e.mastered);
  document.getElementById('stats').textContent=
    e.attempts>0 ? `${e.correct}/${e.attempts} matched, last practiced ${e.last}` : 'Not practiced yet';
  const fb=document.getElementById('feedback');
  fb.textContent=''; fb.className='feedback';
}

document.getElementById('prevBtn').onclick=()=>{idx--;renderCard();};
document.getElementById('nextBtn').onclick=()=>{idx++;renderCard();};

async function postEvent(id,event){
  const res=await fetch(`/api/progress/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event})});
  if(!res.ok) return null;
  const updated=await res.json();
  progress[id]={mastered:updated.mastered,attempts:updated.attempts,correct:updated.correct,last:updated.last};
  renderSummary();
  return updated;
}

document.getElementById('masteredBtn').onclick=async()=>{
  const p=filtered()[idx];
  await postEvent(p.id,'toggle-mastered');
  renderCard();
};

function showFeedback(msg,type){
  const el=document.getElementById('feedback');
  el.textContent=msg; el.className='feedback '+type;
}

let jaVoice=null;
function loadVoice(){
  const voices=window.speechSynthesis.getVoices();
  jaVoice=voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith('ja'))||null;
}
if('speechSynthesis' in window){
  loadVoice();
  window.speechSynthesis.onvoiceschanged=loadVoice;
}

document.getElementById('listenBtn').onclick=()=>{
  const p=filtered()[idx];
  if(!('speechSynthesis' in window)){
    showFeedback("Speech playback isn't supported in this browser.",'info');
    return;
  }
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(p.jp);
  u.lang='ja-JP';
  if(jaVoice) u.voice=jaVoice;
  u.rate=0.85;
  window.speechSynthesis.speak(u);
};

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const speakBtn=document.getElementById('speakBtn');

function resetSpeakBtn(){
  speakBtn.classList.remove('listening');
  speakBtn.textContent='🎤 Say it';
}

if(!SR){
  speakBtn.onclick=()=>showFeedback("Speech input isn't supported in this browser. Try Chrome on desktop or Android.",'info');
}else{
  const recognition=new SR();
  recognition.lang='ja-JP';
  recognition.maxAlternatives=3;
  recognition.interimResults=false;
  let listening=false;
  let targetId='';
  let targetJp='';

  recognition.onresult=async(event)=>{
    const results=event.results[0];
    let matched=false;
    for(let i=0;i<results.length;i++){
      const said=results[i].transcript.replace(/[\s\u3000!?！？。、]/g,'');
      if(said===targetJp||said.includes(targetJp)||targetJp.includes(said)){matched=true;break;}
    }
    await postEvent(targetId, matched?'correct':'attempt');
    showFeedback(matched?"Nailed it. Move on whenever you're ready.":"Not quite a match. Listen again and try once more.", matched?'ok':'retry');
    const e=progress[targetId];
    document.getElementById('stats').textContent=`${e.correct}/${e.attempts} matched, last practiced ${e.last}`;
    listening=false; resetSpeakBtn();
  };
  recognition.onerror=(e)=>{
    if(e.error==='not-allowed'||e.error==='service-not-allowed'){
      showFeedback('Microphone access was blocked. Allow it in your browser to practice speaking.','info');
    }else if(e.error==='no-speech'){
      showFeedback("Didn't catch that. Try again.",'info');
    }else{
      showFeedback('Something interrupted listening. Try again.','info');
    }
    listening=false; resetSpeakBtn();
  };
  recognition.onend=()=>{ listening=false; resetSpeakBtn(); };

  speakBtn.onclick=()=>{
    if(listening) return;
    const p=filtered()[idx];
    targetId=p.id;
    targetJp=p.jp.replace(/[\s\u3000!?！？。、]/g,'');
    listening=true;
    speakBtn.classList.add('listening');
    speakBtn.textContent='🎤 Listening…';
    showFeedback('Say the phrase now…','info');
    try{ recognition.start(); }
    catch(e){ showFeedback('Could not start the microphone. Try again.','info'); listening=false; resetSpeakBtn(); }
  };
}

init();
