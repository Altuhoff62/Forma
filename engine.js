/* FORMA 3.2 — transparent, deterministic, offline training rules. No model/API calls. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.FormaEngine3=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const num=x=>x===''||x===null||x===undefined?NaN:Number(x);
const ok=x=>Number.isFinite(num(x));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dayGap=(now,then)=>Math.max(0,(now-then)/86400000);
const done=e=>(e?.sets||[]).filter(s=>s.done&&ok(s.reps)&&Number(s.reps)>0&&ok(s.weight)&&Number(s.weight)>=0);
const mean=a=>a.reduce((p,c)=>p+c,0)/a.length;
function history(sessions,id){return (sessions||[]).filter(s=>s&&Number.isFinite(Number(s.finished))).sort((a,b)=>a.finished-b.finished).flatMap(s=>{const e=(s.exercises||[]).find(e=>e.id===id);const sets=e?done(e):[];return sets.length?[{finished:Number(s.finished),sets,pain:!!e.pain,sessionId:s.id,checkin:s.checkin||{}}]:[]})}
function measure(h,ex){const a=h.sets;if(!a.length)return null;const weights=a.map(s=>Number(s.weight));const same=weights.every(w=>Math.abs(w-weights[0])<.001);const reps=a.map(s=>Number(s.reps));const rirs=a.map(s=>num(s.rir));return {weight:weights[0],same,sets:a.length,minReps:Math.min(...reps),meanReps:mean(reps),allRir:rirs.every(Number.isFinite),minRir:rirs.every(Number.isFinite)?Math.min(...rirs):null,full:a.length>=clamp(Number(ex.sets)||2,1,5)}}
function ready(checkin={},last=null,now=Date.now()){
 if(checkin.pain)return {mode:'pause',label:'Есть дискомфорт',reason:'Не выполняй движения через боль или нестабильность. При повторении симптомов обсуди нагрузку со специалистом.'};
 if(last&&dayGap(now,last)<1)return {mode:'caution',label:'Недавно была тренировка',reason:'Если мышцы ещё не восстановились, лучше отдохнуть. Для Full Body обычно оставляем хотя бы день между занятиями.'};
 if(checkin.sleep==='poor'||checkin.energy==='low')return {mode:'light',label:'Облегчённый день',reason:'Можно сократить число подходов или отложить тренировку. Сон важнее выполнения плана любой ценой.'};
 if(last&&dayGap(now,last)>14)return {mode:'reentry',label:'Возвращение после перерыва',reason:'После долгого перерыва начни с более лёгкой нагрузки и меньшего объёма.'};
 return {mode:'normal',label:'Обычный режим',reason:'Оставляй запас повторений, выполняй упражнения с контролируемой техникой.'};
}
function generatePlateWeights(handle=0,{paired=false,inventory={3:8,2:4,1.5:4},maxPerSide=4}={}){
 const h=Number(handle);if(!Number.isFinite(h)||h<0||h>200)throw Error('Некорректный вес грифа или рукояти');
 const [aMax,bMax,cMax]=[3,2,1.5].map(w=>Math.min(maxPerSide,Math.floor((Number(inventory[w])||0)/(paired?4:2))));
 const found=new Set();for(let a=0;a<=aMax;a++)for(let b=0;b<=bMax;b++)for(let c=0;c<=cMax;c++){
  if(a+b+c>maxPerSide)continue;found.add(Math.round((h+2*(3*a+2*b+1.5*c))*100)/100)
 }return [...found].sort((a,b)=>a-b)
}
function allowedWeight(current,ex,equipment){const mode=ex.equipment||'dumbbell';if(mode==='bodyweight')return null;const weights=equipment?.[mode];if(Array.isArray(weights)&&weights.length){const next=[...new Set(weights.map(Number).filter(x=>Number.isFinite(x)&&x>=0).map(x=>Math.round((x+Number.EPSILON)*100)/100))].sort((a,b)=>a-b).find(w=>w>current+.001);return next??null}
 const step=Number(ex.step);return Number.isFinite(step)&&step>0?Math.round((current+step)*100)/100:null}
function advise(ex,sessions,checkin={},equipment={},now=Date.now()){
 const hs=history(sessions,ex.id);const baseline={kind:'initial',weight:null,target:ex.min||8,sets:ex.sets||2,observations:hs.length,confidence:'Нет данных',reason:'Выбери комфортный вес самостоятельно. Первое занятие — ориентир, не проверка максимума.'};
 if(!hs.length)return checkin.pain?{...baseline,kind:'caution',reason:'Отмечен дискомфорт: не выполняй болезненное движение.'}:baseline;
 const last=hs[hs.length-1],m=measure(last,ex);if(!m)return baseline;
 const result={...baseline,kind:'hold',weight:m.weight,target:clamp(m.minReps,ex.min,ex.max),sets:ex.sets,confidence:hs.length>=3?'Умеренная':'Предварительная',reason:'Повтори комфортный вес и работай над контролем движения и повторами.'};
 if(checkin.pain||last.pain)return {...result,kind:'caution',confidence:'Осторожно',reason:'Отмечалась боль или нестабильность. Не повышай нагрузку и не выполняй упражнение через боль.'};
 if(dayGap(now,last.finished)>14)return {...result,kind:'reentry',target:ex.min,sets:Math.max(1,ex.sets-1),confidence:'Осторожно',reason:'Был перерыв более двух недель. Начни легче, прежний вес не обязателен.'};
 if(checkin.sleep==='poor'||checkin.energy==='low')return {...result,kind:'light',sets:Math.max(1,ex.sets-1),reason:'Плохой сон или низкая энергия: сократи подходы или отдохни. Вес увеличивать не нужно.'};
 if(m.minRir!==null&&m.minRir<=1)return {...result,kind:'hold',reason:'Последний раз было близко к отказу. Не повышай вес, постарайся сохранить запас в 2–3 повтора.'};
 if(hs.length>=3){const three=hs.slice(-3).map(h=>measure(h,ex));if(three.every(v=>v.full&&v.same&&Math.abs(v.weight-m.weight)<.001)&&three.some(v=>v.minReps<ex.max)&&Math.max(...three.map(v=>v.meanReps))-Math.min(...three.map(v=>v.meanReps))<.5)return {...result,kind:'plateau',reason:'Три сопоставимых занятия без изменения повторений. Это не провал: проверь восстановление и технику, не увеличивай вес автоматически.'}}
 const strong=x=>x&&x.full&&x.same&&x.allRir&&x.minRir>=2&&x.minReps>=ex.max;
 const prev=hs.length>1?measure(hs[hs.length-2],ex):null;
 if(strong(m)&&strong(prev)&&Math.abs(m.weight-prev.weight)<.001&&m.weight>0){const next=allowedWeight(m.weight,ex,equipment);if(next===null)return {...result,kind:'hold',reason:'Два успешных занятия, но следующего доступного веса не найдено. Продолжай улучшать технику.'};const jump=(next-m.weight)/m.weight;if(jump>.1)return {...result,kind:'hold',reason:'Два успешных занятия, но следующий доступный вес требует прибавки более 10%. Пока сохрани текущий вес.'};return {...result,kind:'raise',weight:next,target:ex.min,confidence:'Умеренная',reason:`Два занятия подряд все подходы выполнены в верхней границе диапазона с запасом. Можно попробовать ${next} кг, только если техника стабильна.`}}
 if(strong(m))return {...result,kind:'confirm',target:ex.max,reason:'Верх диапазона достигнут один раз. Повтори результат прежде, чем прибавлять вес.'};
 if(!m.full||!m.same)return {...result,kind:'hold',reason:'Не все подходы выполнены или веса различались. Пока недостаточно сопоставимых данных для повышения.'};
 if(m.minReps<ex.min)return {...result,kind:'light',target:ex.min,reason:'Повторений меньше целевого диапазона. Выбери более лёгкий комфортный вес или меньше подходов.'};
 return {...result,kind:'reps',target:Math.min(ex.max,m.minReps+1),reason:'Можно попробовать добавить одно повторение в подходе, оставляя 2–3 повтора в запасе.'};
}
function selectExercises(program,minutes,mode='normal'){
 const all=(program||[]).map(e=>({...e}));if(!all.length)return[];
 const limit=minutes<=25?4:minutes<=40?5:all.length;
 if(all.length<=limit)return all.map(e=>({...e,sets:mode==='light'||mode==='reentry'?Math.min(e.sets,1):e.sets}));
 // Short sessions contain at least one lower-body movement, avoiding an all-upper workout.
 let chosen=all.slice(0,limit);
 if(!chosen.some(e=>e.group==='lower')){const lower=all.find(e=>e.group==='lower');if(lower)chosen[chosen.length-1]=lower}
 return chosen.map(e=>({...e,sets:mode==='light'||mode==='reentry'?Math.min(e.sets,1):e.sets}));
}
function weekCount(sessions,now=Date.now()){const start=now-7*86400000;return(sessions||[]).filter(s=>s.finished>=start&&s.finished<=now).length}
function trend(sessions,id){const h=history(sessions,id),recent=h.slice(-4);if(recent.length<2)return {kind:'none',label:'Мало данных'};const a=measure(recent[0],{sets:1}),b=measure(recent[recent.length-1],{sets:1});if(!a||!b)return {kind:'none',label:'Мало данных'};if(Math.abs(b.weight-a.weight)<.001){const delta=b.meanReps-a.meanReps;return delta>.45?{kind:'up',label:`+${delta.toFixed(1)} повт. при том же весе`}:delta<-.45?{kind:'down',label:'Меньше повторений при том же весе'}:{kind:'flat',label:'Примерно без изменений'}};return b.weight>a.weight?{kind:'up',label:'Рабочий вес увеличился'}:{kind:'mixed',label:'Использован более лёгкий вес'} }
return {history,measure,ready,advise,selectExercises,weekCount,trend,allowedWeight,dayGap,generatePlateWeights};
});
