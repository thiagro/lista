const notesList = document.getElementById("notesList");
const editor = document.getElementById("editor");
const emptyState = document.getElementById("emptyState");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const listEditor = document.getElementById("listEditor");
const tasksContainer = document.getElementById("tasks");
const noteType = document.getElementById("noteType");
const saveStatus = document.getElementById("saveStatus");
const searchInput = document.getElementById("search");
const createMenu = document.getElementById("createMenu");

const STORAGE_KEY = "meuBlocoNotas.v1";
let notes = loadNotes();
let currentNoteId = null;

function loadNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Não foi possível carregar as anotações:", error);
    return [];
  }
}

function saveStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    saveStatus.textContent = "Salvo neste dispositivo";
  } catch (error) {
    saveStatus.textContent = "Não foi possível salvar";
    console.error("Erro ao salvar:", error);
  }
}

function getCurrentNote() {
  return notes.find(note => note.id === currentNoteId);
}

function createNote(type) {
  const now = new Date().toISOString();
  const note = {
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    type,
    title: "",
    content: "",
    tasks: [],
    createdAt: now,
    updatedAt: now
  };

  notes.unshift(note);
  currentNoteId = note.id;
  saveStorage();
  openNote(note.id);

  if (type === "list") {
    addTask();
  } else {
    noteTitle.focus();
  }
  renderNotes();
}

function openNote(id) {
  const note = notes.find(item => item.id === id);
  if (!note) return;

  currentNoteId = id;
  emptyState.classList.add("hidden");
  editor.classList.remove("hidden");
  document.body.classList.add("mobile-editor");

  noteTitle.value = note.title || "";
  noteContent.value = note.content || "";

  const isList = note.type === "list";
  noteType.textContent = isList ? "LISTA" : "ANOTAÇÃO";
  noteContent.classList.toggle("hidden", isList);
  listEditor.classList.toggle("hidden", !isList);

  renderTasks();
  renderNotes();
  saveStatus.textContent = "Salvo neste dispositivo";
}

function updateNote() {
  const note = getCurrentNote();
  if (!note) return;

  note.title = noteTitle.value;
  note.content = noteContent.value;
  note.updatedAt = new Date().toISOString();
  saveStorage();
  renderNotes();
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function renderNotes() {
  const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
  notesList.replaceChildren();

  const filtered = notes.filter(note => {
    const taskText = (note.tasks || []).map(task => task.text).join(" ");
    const content = `${note.title || ""} ${note.content || ""} ${taskText}`;
    return content.toLocaleLowerCase("pt-BR").includes(query);
  });

  document.getElementById("notesCount").textContent = String(notes.length);

  if (filtered.length === 0) {
    const message = document.createElement("div");
    message.className = "no-notes";
    message.textContent = notes.length ? "Nenhuma anotação encontrada." : "Suas anotações aparecerão aqui.";
    notesList.appendChild(message);
    return;
  }

  filtered.forEach(note => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "note-item";
    if (note.id === currentNoteId) item.classList.add("active");

    const title = document.createElement("strong");
    title.textContent = note.title.trim() || (note.type === "list" ? "Nova lista" : "Nova anotação");

    const detail = document.createElement("small");
    const kind = note.type === "list" ? "☑ Lista" : "✎ Anotação";
    detail.textContent = `${kind} · ${formatDate(note.updatedAt || note.createdAt)}`;

    item.append(title, detail);
    item.addEventListener("click", () => openNote(note.id));
    notesList.appendChild(item);
  });
}

function renderTasks() {
  const note = getCurrentNote();
  if (!note || note.type !== "list") return;

  tasksContainer.replaceChildren();

  (note.tasks || []).forEach(task => {
    const row = document.createElement("div");
    row.className = "task";
    if (task.completed) row.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.completed);
    checkbox.setAttribute("aria-label", "Marcar tarefa como concluída");
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      note.updatedAt = new Date().toISOString();
      saveStorage();
      renderTasks();
      renderNotes();
    });

    const input = document.createElement("input");
    input.type = "text";
    input.value = task.text || "";
    input.placeholder = "Digite uma tarefa...";
    input.setAttribute("aria-label", "Descrição da tarefa");
    input.addEventListener("input", () => {
      task.text = input.value;
      note.updatedAt = new Date().toISOString();
      saveStorage();
      renderNotes();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-task";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remover tarefa");
    remove.addEventListener("click", () => {
      note.tasks = note.tasks.filter(item => item.id !== task.id);
      note.updatedAt = new Date().toISOString();
      saveStorage();
      renderTasks();
      renderNotes();
    });

    row.append(checkbox, input, remove);
    tasksContainer.appendChild(row);
  });

  const total = note.tasks.length;
  const completed = note.tasks.filter(task => task.completed).length;
  document.getElementById("taskProgress").textContent =
    total ? `${completed} de ${total} tarefas concluídas` : "Sua lista está vazia.";
}

function addTask() {
  const note = getCurrentNote();
  if (!note || note.type !== "list") return;

  note.tasks.push({
    id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    text: "",
    completed: false
  });
  note.updatedAt = new Date().toISOString();
  saveStorage();
  renderTasks();
  renderNotes();

  const inputs = tasksContainer.querySelectorAll('input[type="text"]');
  inputs[inputs.length - 1]?.focus();
}

function deleteNote() {
  if (!currentNoteId) return;
  if (!window.confirm("Deseja excluir esta anotação?")) return;

  notes = notes.filter(note => note.id !== currentNoteId);
  currentNoteId = null;
  saveStorage();

  editor.classList.add("hidden");
  emptyState.classList.remove("hidden");
  document.body.classList.remove("mobile-editor");
  renderNotes();
}

function goBackToNotes() {
  document.body.classList.remove("mobile-editor");
  createMenu.classList.add("hidden");
  renderNotes();
}

document.getElementById("newNote").addEventListener("click", () => createNote("note"));
document.getElementById("newList").addEventListener("click", () => createNote("list"));
document.getElementById("addTask").addEventListener("click", addTask);
document.getElementById("deleteNote").addEventListener("click", deleteNote);
document.getElementById("backToNotes").addEventListener("click", goBackToNotes);
noteTitle.addEventListener("input", updateNote);
noteContent.addEventListener("input", updateNote);
searchInput.addEventListener("input", renderNotes);

document.getElementById("mobileCreate").addEventListener("click", event => {
  const willOpen = createMenu.classList.contains("hidden");
  createMenu.classList.toggle("hidden");
  event.currentTarget.setAttribute("aria-expanded", String(willOpen));
});

document.getElementById("menuNote").addEventListener("click", () => {
  createMenu.classList.add("hidden");
  document.getElementById("mobileCreate").setAttribute("aria-expanded", "false");
  createNote("note");
});

document.getElementById("menuList").addEventListener("click", () => {
  createMenu.classList.add("hidden");
  document.getElementById("mobileCreate").setAttribute("aria-expanded", "false");
  createNote("list");
});

document.addEventListener("click", event => {
  if (!event.target.closest("#createMenu") && !event.target.closest("#mobileCreate")) {
    createMenu.classList.add("hidden");
    document.getElementById("mobileCreate").setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("mobile-editor")) {
    goBackToNotes();
  }
});

renderNotes();

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(error => {
      console.error("Falha ao registrar o Service Worker:", error);
    });
  });
}
