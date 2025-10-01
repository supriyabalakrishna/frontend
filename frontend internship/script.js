let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
tasks = tasks.map(t => ({ name: t.name||"", done: !!t.done, xpAwarded: !!t.xpAwarded, date: t.date||"", priority: t.priority||"medium", category: t.category||"Personal" }));
let xp = parseInt(localStorage.getItem("xp")||"0",10);
let level = parseInt(localStorage.getItem("level")||"1",10);
let badges = JSON.parse(localStorage.getItem("badges")) || [];
let streak = parseInt(localStorage.getItem("streak")||"0",10);
let lastComplete = localStorage.getItem("lastComplete") || "";

function saveAll(){
  localStorage.setItem("tasks",JSON.stringify(tasks));
  localStorage.setItem("xp",xp);
  localStorage.setItem("level",level);
  localStorage.setItem("badges",JSON.stringify(badges));
  localStorage.setItem("streak",streak);
  localStorage.setItem("lastComplete",lastComplete);
}

function addTask(){
  const name=document.getElementById("taskInput").value.trim();
  const date=document.getElementById("dateInput").value||"";
  const priority=document.getElementById("priorityInput").value||"medium";
  const category=document.getElementById("categoryInput").value||"Personal";
  if(!name){alert("Please enter a task name.");return;}
  tasks.push({name,done:false,xpAwarded:false,date,priority,category});
  document.getElementById("taskInput").value="";
  document.getElementById("dateInput").value="";
  saveAll();renderAll();showPage('tasks');showToast("Task Added ✅");
}

function xpForPriority(p){return p==="high"?30:p==="medium"?20:10;}

function toggleTask(idx){
  if(idx<0||idx>=tasks.length)return;
  tasks[idx].done=!tasks[idx].done;
  if(tasks[idx].done && !tasks[idx].xpAwarded){
    xp += xpForPriority(tasks[idx].priority);
    tasks[idx].xpAwarded=true;
    checkLevelUp();
    checkBadges();
    updateStreak();
  }
  saveAll();renderAll();
}

function deleteTask(idx){
  if(idx<0||idx>=tasks.length)return;
  if(tasks[idx].xpAwarded && !confirm("XP already awarded. Continue delete?")) return;
  tasks.splice(idx,1);saveAll();renderAll();
}

function clearAll(){
  if(!confirm("Clear all tasks AND reset progress? Click Cancel to clear tasks only."))return;
  const resetProg=confirm("Also reset XP, level, badges, streak? OK=Yes, Cancel=No");
  if(resetProg){tasks=[];xp=0;level=1;badges=[];streak=0;lastComplete="";} else {tasks=[];}
  saveAll();renderAll();
}

function checkLevelUp(){while(xp>=100){xp-=100;level++;showToast(`🎉 Level Up! Lv ${level}`);}}

function checkBadges(){
  const doneCount = tasks.filter(t=>t.done).length;
  if(!badges.includes("First Task") && doneCount>=1) badges.push("First Task");
  if(!badges.includes("5 Tasks Master") && doneCount>=5) badges.push("5 Tasks Master");
  if(!badges.includes("Weekly Streak") && streak>=7) badges.push("Weekly Streak");
}

function updateStreak(){
  const today = new Date().toISOString().slice(0,10);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yStr = yesterday.toISOString().slice(0,10);
  if(lastComplete===yStr){streak++;} else if(lastComplete!==today){streak=1;}
  lastComplete = today;
  saveAll();
}

function showToast(msg){
  const t=document.getElementById("toast"); t.textContent=msg; t.style.opacity=1;
  setTimeout(()=>{t.style.opacity=0;},3000);
}

function toggleDarkMode(){document.body.classList.toggle("dark");}

function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelectorAll(".nav-group button").forEach(b=>b.classList.remove("active"));
  document.getElementById("nav-"+id)?.classList.add("active");
}

function editTask(idx){
  const t=tasks[idx];
  const name=prompt("Edit task name:",t.name); if(name!==null) t.name=name;
  const date=prompt("Edit due date (YYYY-MM-DD):",t.date); if(date!==null) t.date=date;
  const priority=prompt("Edit priority (low,medium,high):",t.priority); if(priority!==null) t.priority=priority;
  const category=prompt("Edit category (Personal,Work,Fitness):",t.category); if(category!==null) t.category=category;
  saveAll();renderAll();
}

function formatDate(d){try{const dt=new Date(d+"T00:00:00"); return isNaN(dt)?d:dt.toLocaleDateString();}catch(e){return d;}}

function escapeHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}

let weeklyChart;
function updateWeeklyChart(){
  const today=new Date(); const labels=[]; const data=[];
  for(let i=6;i>=0;i--){
    const day=new Date(); day.setDate(today.getDate()-i);
    labels.push(day.toLocaleDateString('en-US',{weekday:'short'}));
    const dayStr = day.toISOString().slice(0,10);
    const count = tasks.filter(t=>t.done && t.date===dayStr).length;
    data.push(count);
  }
  const ctx=document.getElementById('weeklyChart').getContext('2d');
  if(weeklyChart) weeklyChart.destroy();
  weeklyChart=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[{label:'Tasks Completed',data,backgroundColor:'rgba(255,99,132,0.6)',borderColor:'rgba(255,99,132,1)',borderWidth:1,borderRadius:6}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,precision:0,stepSize:1}}}
  });
}

// --- Drag & Drop ---
let draggedIdx = null;
function dragStart(e){draggedIdx = parseInt(this.dataset.idx); this.style.opacity="0.5";}
function dragOver(e){e.preventDefault();}
function drop(e){
  e.preventDefault();
  const targetIdx = parseInt(this.dataset.idx);
  if(draggedIdx===null||targetIdx===draggedIdx) return;
  const temp = tasks[draggedIdx];
  tasks.splice(draggedIdx,1);
  tasks.splice(targetIdx,0,temp);
  saveAll(); renderTasks();
}
function dragEnd(e){this.style.opacity="1"; draggedIdx=null;}

// --- Render Tasks ---
function renderAll(){renderHeaderStats();renderDashboard();renderTasks();renderAchievements();updateWeeklyChart();saveAll();}
function renderHeaderStats(){document.getElementById("gameStats").textContent=`⭐ Lv ${level} • XP ${xp}/100`;}
function renderDashboard(){
  const stats=document.getElementById("stats");
  const bar=document.getElementById("taskProgress");
  const badgesDisplay=document.getElementById("badgesDisplay");
  const streakEl=document.getElementById("streakDisplay");
  const total=tasks.length;
  const doneCount=tasks.filter(t=>t.done).length;
  stats.textContent=`📋 Total: ${total} | ✅ Completed: ${doneCount} | ⏳ Pending: ${total-doneCount}`;
  const percent=total?Math.round((doneCount/total)*100):0;
  bar.style.width=percent+"%"; bar.textContent=percent+"%";
  badgesDisplay.innerHTML = badges.map(b=>`<div class="badge">${b}</div>`).join("")||"<div class='muted'>No badges yet</div>";
  streakEl.textContent=streak;
}
function renderTasks(){
  const container=document.getElementById("taskList");
  if(!container) return;
  container.innerHTML="";
  let display=tasks.map((t,i)=>({...t,_idx:i}));
  const search=(document.getElementById("searchInput")?.value||"").trim().toLowerCase();
  if(search) display=display.filter(d=>d.name.toLowerCase().includes(search)||d.priority.toLowerCase().includes(search)||d.date.includes(search));
  const sortBy=document.getElementById("sortBy")?.value||"default";
  if(sortBy==="priority"){const order={high:1,medium:2,low:3};display.sort((a,b)=>(order[a.priority]||3)-(order[b.priority]||3));}
  else if(sortBy==="date"){display.sort((a,b)=>((a.date||"9999-12-31").localeCompare(b.date||"9999-12-31")));}
  else if(sortBy==="done"){display.sort((a,b)=>(a.done===b.done?0:a.done?1:-1));}
  const filterCategory=document.getElementById("filterCategory")?.value||"all";
  if(filterCategory!=="all"){display=display.filter(d=>d.category===filterCategory);}
  for(const d of display){
    const li=document.createElement("li");
    li.className="task"+(d.done?" done":"");
    li.setAttribute("draggable","true"); li.dataset.idx=d._idx;
    li.addEventListener("dragstart",dragStart); li.addEventListener("dragover",dragOver);
    li.addEventListener("drop",drop); li.addEventListener("dragend",dragEnd);
    const todayStr=new Date().toISOString().slice(0,10);
    if(d.date<todayStr && !d.done) li.classList.add("overdue");
    if(d.date===todayStr) li.classList.add("today");
    li.innerHTML=`<div class="task-left">
      <input type="checkbox" ${d.done?"checked":""} onchange="toggleTask(${d._idx})" />
      <div>
        <div class="label" style="font-weight:800">${escapeHtml(d.name)}</div>
        <div class="meta">
          ${d.date?`📅 ${formatDate(d.date)} &nbsp;`:''}
          <span class="priority ${d.priority==='high'?'prio-high':d.priority==='medium'?'prio-medium':'prio-low'}">${d.priority.toUpperCase()}</span>
          &nbsp;<span>${d.category}</span>
          ${d.xpAwarded?` &nbsp;• XP awarded`:''}
        </div>
      </div>
    </div>
    <div class="task-actions">
      <button onclick="editTask(${d._idx})">✏️</button>
      <button class="del" onclick="deleteTask(${d._idx})">❌</button>
    </div>`;
    container.appendChild(li);
  }
}

function renderAchievements(){
  document.getElementById("badgesArea").innerHTML=badges.map(b=>`<div class="badge">${b}</div>`).join("")||"<div class='muted'>No badges yet</div>";
  document.getElementById("lvlDisplay").textContent=level;
  document.getElementById("xpDisplay").textContent=xp;
  document.getElementById("streakDisplayAch").textContent=streak;
}

function resetProgress(){if(!confirm("Reset XP, level, badges, streak?"))return; xp=0; level=1; badges=[]; streak=0; lastComplete=""; saveAll(); renderAll(); showToast("Progress reset.");}

renderAll();

window.showPage=showPage; window.addTask=addTask; window.toggleTask=toggleTask;
window.deleteTask=deleteTask; window.clearAll=clearAll; window.renderTasks=renderTasks;
window.resetProgress=resetProgress;
