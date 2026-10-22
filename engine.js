/* FORMA decision engine v2 · deterministic, offline, inspectable */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.FormaEngine=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const num=v=>(v===''||v===null||v===undefined)?NaN:Number(v);
const valid=n=>Number.isFinite(n);
const days=(later,earlier)=>Math.max(0,(later-earlier)/86400000);
const completed=ex=>(ex?.sets||[]).filter(s=>s.done&&valid(num(s.reps))&&num(s.reps)>0);
const median=ns=>{if(!ns.length)return NaN;const a=[...ns].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2};
function exerciseHistory(sessions,id){return (sessions||[]).filter(s=>s&&Number.isFinite(s.finished)).sort((a,b)=>a.finished-b.finished).flatMap(s=>{const e=(s.exercises||[]).find(x=>x.id===id);const sets=e?completed(e):[];return sets.length?[{time:s.finished,sets,pain:Boolean(e.pain),sessionId:s.id,energy:s.checkin?.energy||'',sleep:s.checkin?.sleep||'',minutes:s.targetMinutes||45}]:[]})}
function sessionStats(entry){const ws=entry.sets.filter(s=>valid(num(s.weight))&&num(s.weight)>=0&&valid(num(s.reps))&&num(s.reps)>0);const weights=ws.map(s=>num(s.weight));const reps=ws.map(s=>num(s.reps));return {count:ws.length,weight:median(weights),minReps:reps.length?Math.min(...reps):NaN,maxReps:reps.length?Math.max(...reps):NaN,meanReps:reps.length?reps.reduce((a,b)=>a+b,0)/reps.length:NaN,allSameWeight:ws.length>0&&weights.every(v=>Math.abs(v-weights[0])<1e-5),allRirKnown:ws.length>0&&ws.every(s=>valid(num(s.rir))),minRir:Math.min(...ws.map(s=>valid(num(s.rir))?num(s.rir):Infinity))}}
function suggestion(ex,sessions,checkin={},now=Date.now()){
 const h=exerciseHistory(sessions,ex.id), base={kind:'initial',weight:null,reps:ex.min,sets:ex.sets,confidence:'Нет данных',reason:'Начни с комфортного веса и нескольких повторений в запасе. Не подбираем стартовый вес автоматически.',signals:[],observations:h.length};
 const energy=checkin.energy||'ok',sleep=checkin.sleep||'ok',painNow=checkin.pain===true;
 if(!h.length){if(painNow)return {...base,kind:'caution',reason:'Отмечен дискомфорт или нестабильность. Не выполняй болезненное упражнение; при повторении симптомов обратись к специалисту.'};return base}
 const last=h[h.length-1],m=sessionStats(last),older=h.length>1?sessionStats(h[h.length-2]):null,gap=days(now,last.time),badRecovery=energy==='low'||sleep==='poor';
 const result={kind:'hold',weight:valid(m.weight)?m.weight:null,reps:clamp(valid(m.minReps)?m.minReps:ex.min,ex.min,ex.max),sets:ex.sets,confidence:h.length>=3?'Умеренная':'Предварительная',reason:'Сохрани нагрузку, продолжай улучшать технику и уверенность.',signals:[],observations:h.length};
 if(painNow||last.pain){result.kind='caution';result.confidence='Осторожно';result.reason='Был отмечен дискомфорт или нестабильность. Не повышай нагрузку и не повторяй движение через боль. При повторении симптомов обсуди упражнение со специалистом.';result.signals.push('Дискомфорт');return result}
 if(gap>14){result.kind='reentry';result.confidence='Осторожно';result.reps=ex.min;result.reason=`После перерыва ${Math.floor(gap)} дн. вернись с более лёгким комфортным весом и/или меньшим числом подходов. Прежний вес — только ориентир, не цель.`;result.signals.push('Перерыв');return result}
 if(badRecovery){result.kind='easy';result.confidence='Осторожно';result.sets=Math.max(1,ex.sets-1);result.reason='Сегодня мало энергии или плохо спал. Сократи объём либо перенеси тренировку. Увеличение веса не требуется.';result.signals.push('Восстановление');return result}
 const loggedRir=last.sets.filter(s=>valid(num(s.rir))).map(s=>num(s.rir));
 if(loggedRir.length&&Math.min(...loggedRir)<=1){result.kind='easy';result.reason='Последний раз подходы были близки к отказу. Оставь тот же или меньший вес, сохрани запас 2–3 повторения.';result.signals.push('Высокая нагрузка');return result}
 // Plateau = 3 comparable sessions with flat median reps, not a mandate for more weight.
 if(h.length>=3){const recent=h.slice(-3).map(sessionStats);const comparable=recent.every(x=>x.count>=ex.sets&&x.allSameWeight&&valid(x.weight)&&Math.abs(x.weight-recent[2].weight)<1e-5);if(comparable&&Math.max(...recent.map(x=>x.meanReps))-Math.min(...recent.map(x=>x.meanReps))<0.5){result.signals.push('Без заметной динамики 3 занятия');result.kind='plateau';result.reason='Три сопоставимые тренировки без прироста повторений. Проверь отдых и технику; пока не увеличивай вес.';return result}}
 const fullyLogged=m.count>=ex.sets&&m.allSameWeight&&m.allRirKnown;
 const meetsTop=fullyLogged&&m.minReps>=ex.max&&m.minRir>=2;
 const confirmed=older&&older.count>=ex.sets&&older.allSameWeight&&older.allRirKnown&&older.minReps>=ex.max&&older.minRir>=2&&valid(older.weight)&&Math.abs(m.weight-older.weight)<1e-5;
 if(meetsTop&&confirmed&&num(ex.step)>0&&valid(m.weight)&&m.weight>0){
  const step=num(ex.step),relative=step/m.weight;
  if(relative<=0.1){result.kind='raise';result.weight=Math.round((m.weight+step)*100)/100;result.reps=ex.min;result.confidence='Умеренная';result.reason=`Два занятия подряд все ${ex.sets} подхода достигли ${ex.max} повторений с запасом. Можно попробовать минимальный шаг +${step} кг при хорошей технике. Это необязательно.`;result.signals.push('Два подтверждения');return result}
  result.kind='hold';result.reason='Верх диапазона освоен, но доступный шаг веса слишком велик (>10%). Оставь текущий вес, укрепляй технику или используй меньший шаг.';result.signals.push('Крупный шаг веса');return result
 }
 if(meetsTop){result.kind='hold';result.reps=ex.max;result.reason='Верх диапазона достигнут. Повтори такой результат ещё раз с хорошей техникой, прежде чем пробовать увеличивать вес.';result.signals.push('Первое подтверждение');return result}
 if(!fullyLogged){result.kind='hold';result.reason='Последние данные неполные или рабочие веса различались между подходами. Сохрани комфортный вес; пока слишком рано советовать прибавку.';return result}
 if(m.minReps<ex.min){result.kind='easy';result.reps=ex.min;result.reason='Пока не достигнут нижний предел повторений. Уменьши нагрузку или число подходов, сохраняя хорошую технику.';return result}
 result.kind='reps';result.reps=clamp(m.minReps+1,ex.min,ex.max);result.reason=`Оставь ${m.weight} кг. Если чувствуешь себя хорошо, попробуй выполнить до ${result.reps} повторений без потери техники и запаса.`;
 return result;
}
function readiness(checkin={},lastFinished=null,now=Date.now()){
 if(checkin.pain===true)return {mode:'pause',label:'Без болезненных движений',detail:'При боли или нестабильности не выполняй соответствующее упражнение; при повторении симптомов обсуди это со специалистом.'};
 if(lastFinished&&days(now,lastFinished)<1)return {mode:'pause',label:'Сегодня лучше восстановиться',detail:'Тренировка уже была менее суток назад. Отдых — тоже часть программы.'};
 if(checkin.energy==='low'||checkin.sleep==='poor')return {mode:'light',label:'Облегчённый вариант',detail:'Проведи короткую тренировку с меньшим числом подходов или отдохни, если чувствуешь сильную усталость.'};
 if(lastFinished&&days(now,lastFinished)>14)return {mode:'return',label:'После перерыва',detail:'Возвращайся постепенно: меньше объёма и комфортные нагрузки вместо прошлых рекордов.'};
 return {mode:'normal',label:'Обычный режим',detail:'Сосредоточься на технике и последовательном прогрессе.'};
}
function plannedSets(exercises,minutes,mode){const count=exercises.length;if(!count)return [];const cap=minutes<=25?4:minutes<=40?5:count;const filtered=exercises.slice(0,cap);const low=mode==='light'||mode==='return';return filtered.map(e=>({...e,sets:Math.min(e.sets,low?1:2)}));}
function trend(sessions,id){const data=exerciseHistory(sessions,id),recent=data.slice(-5).map(x=>({date:x.time,...sessionStats(x)}));if(recent.length<2)return {status:'new',label:'Мало записей',entries:recent};const a=recent[0],b=recent[recent.length-1];if(!valid(a.weight)||!valid(b.weight))return {status:'mixed',label:'Неполные данные',entries:recent};if(b.weight>a.weight&&b.minReps>=a.minReps)return {status:'improving',label:'Рабочий вес вырос',entries:recent};if(Math.abs(b.weight-a.weight)<1e-5&&b.meanReps>a.meanReps+0.5)return {status:'improving',label:'Повторов стало больше',entries:recent};if(recent.length>=3&&recent.every(x=>Math.abs(x.weight-b.weight)<1e-5)&&Math.max(...recent.map(x=>x.meanReps))-Math.min(...recent.map(x=>x.meanReps))<0.5)return {status:'flat',label:'Показатели стабильны',entries:recent};return {status:'mixed',label:'Смешанная динамика',entries:recent}}
return {suggestion,readiness,plannedSets,exerciseHistory,sessionStats,trend,days};
});
