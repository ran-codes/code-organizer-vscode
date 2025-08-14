import React, { useState, useEffect } from 'react';

{/* // 1. Component Setup ---- */}
function TodoApp() {
  {/* // 1.1 State Management ---- */}
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  {/* //// 1.1.1 Todo Operations ---- */}
  const addTodo = (text) => {
    setTodos([...todos, { 
      id: Date.now(), 
      text, 
      done: false,
      createdAt: new Date()
    }]);
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
  };

  {/* //// 1.1.2 Filter Logic ---- */}
  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'active': return !todo.done;
      case 'completed': return todo.done;
      default: return true;
    }
  });

  {/* // 1.2 Effects ---- */}
  useEffect(() => {
    // Load todos from localStorage
    const saved = localStorage.getItem('todos');
    if (saved) {
      setTodos(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save todos to localStorage
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  {/* // 2. Event Handlers ---- */}
  const handleSubmit = (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (input.value.trim()) {
      addTodo(input.value.trim());
      input.value = '';
    }
  };

  const handleClearCompleted = () => {
    setTodos(todos.filter(todo => !todo.done));
  };

  {/* // 3. Render Methods ---- */}
  {/* //// 3.1 Todo Item Renderer ---- */}
  const renderTodo = (todo) => (
    <li key={todo.id} className={`todo-item ${todo.done ? 'completed' : ''}`}>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => toggleTodo(todo.id)}
      />
      <span className="todo-text">{todo.text}</span>
      <small className="todo-date">
        {todo.createdAt.toLocaleDateString()}
      </small>
    </li>
  );

  {/* //// 3.2 Filter Buttons ---- */}
  const renderFilters = () => (
    <div className="filters">
      {['all', 'active', 'completed'].map(filterType => (
        <button
          key={filterType}
          className={filter === filterType ? 'active' : ''}
          onClick={() => setFilter(filterType)}
        >
          {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
        </button>
      ))}
    </div>
  );

  {/* // 4. Main Render ---- */}
  return (
    <div className="todo-app">
      {/* // 4.1 Header Section ---- */}
      <header className="app-header">
        <h1>Todo List</h1>
        <form onSubmit={handleSubmit} className="todo-form">
          <input
            type="text"
            placeholder="What needs to be done?"
            className="todo-input"
          />
          <button type="submit">Add</button>
        </form>
      </header>

      {/* // 4.2 Main Content ---- */}
      <main className="app-main">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            {/* //// 4.2.1 Todo List ---- */}
            <ul className="todo-list">
              {filteredTodos.map(renderTodo)}
            </ul>

            {/* //// 4.2.2 Stats & Controls ---- */}
            <div className="todo-stats">
              <span>{todos.filter(t => !t.done).length} items left</span>
              {renderFilters()}
              <button onClick={handleClearCompleted}>
                Clear completed
              </button>
            </div>
          </>
        )}
      </main>

      {/* // 4.3 Footer ---- */}
      <footer className="app-footer">
        <p>Double-click to edit a todo</p>
        <p>Created with React</p>
      </footer>
    </div>
  );
}

{/* // 5. Export ---- */}
export default TodoApp;
