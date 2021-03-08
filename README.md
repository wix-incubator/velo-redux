# velo-redux

![image](https://user-images.githubusercontent.com/1764161/110261469-0a18b200-7fb9-11eb-9433-5f0028ced01b.png)

Velo bindings for Redux.

Demo: https://shahartalmi36.wixsite.com/velo-redux ([Open in Wix Editor](https://editor.wix.com/html/editor/web/renderer/new?metaSiteId=e1f44b70-cd35-4b6b-8bb3-ac6b19337448&siteId=bb881bf8-92da-42e9-93ae-0dc99b61cddc))

Counter example:

```js
import { createConnect } from '@wix/velo-redux';
import { createStore } from 'redux';

function reducer(state = 0, action) {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1;
    case 'DECREMENT':
      return state - 1;
    default:
      return state;
  }
}

let store = createStore(reducer);
let { connect, pageConnect } = createConnect(store);

pageConnect(() => {
  connect(state => ({ text: `${state}` }))($w('#counter'));
  $w('#increment').onClick(() => store.dispatch({ type: 'INCREMENT' }));
  $w('#decrement').onClick(() => store.dispatch({ type: 'DECREMENT' }));
});
```

TodoMVC example:

```js
import { createConnect } from '@wix/velo-redux';
import { createStore } from 'redux';

let counter = 0;

const initialState = {
  editMode: false,
  currentFilter: 'all',
  tasks: [
    { _id: `${++counter}`, description: 'Task 1', completed: false },
    { _id: `${++counter}`, description: 'Task 2', completed: true },
    { _id: `${++counter}`, description: 'Task 3', completed: false }
  ]
};

function rootReducer(state = initialState, action) {
  switch (action.type) {
    case 'ADD_TODO':
      return Object.assign({}, state, {
        tasks: [
          ...state.tasks,
          { _id: action.id, description: action.text, completed: false }
        ]
      });
    case 'EDIT_TODO':
      return Object.assign({}, state, { editMode: action.id });
    case 'TOGGLE_TODO':
      return Object.assign({}, state, {
        tasks: state.tasks.map(todo =>
          todo._id === action.id
            ? Object.assign({}, todo, { completed: action.completed })
            : todo
        )
      });
    case 'UPDATE_TODO':
      return Object.assign({}, state, {
        editMode: false,
        tasks: state.tasks.map(todo =>
          todo._id === action.id
            ? Object.assign({}, todo, { description: action.description })
            : todo
        )
      });
    case 'DELETE_TODO':
      return Object.assign({}, state, {
        tasks: state.tasks.filter(todo => todo._id !== action.id)
      });
    case 'CHECK_ALL':
      return Object.assign({}, state, {
        tasks: state.tasks.map(todo =>
          Object.assign({}, todo, { completed: action.completed })
        )
      });
    case 'CLEAR_ALL':
      return Object.assign({}, state, {
        tasks: state.tasks.filter(x => !x.completed)
      });
    case 'SET_FILTER':
      return Object.assign({}, state, { currentFilter: action.filter });
    default:
      return state;
  }
}

function getTasks(state) {
  if (state.currentFilter === 'active') {
    return state.tasks.filter(x => !x.completed);
  } else if (state.currentFilter === 'completed') {
    return state.tasks.filter(x => x.completed);
  } else {
    return state.tasks;
  }
}

let store = createStore(rootReducer);
let { connect, repeaterConnect, pageConnect } = createConnect(store);

pageConnect(() => {
  connect(state => ({
    checked: state.tasks.filter(x => !x.completed).length === 0
  }))($w('#checkAll'));
  connect(state => ({
    text: `${state.tasks.filter(x => !x.completed).length} items left`
  }))($w('#left'));
  connect(state => ({
    visible: state.tasks.filter(x => x.completed).length > 0
  }))($w('#clear'));
  connect(state => ({
    style: { borderColor: state.currentFilter === 'all' ? 'black' : 'white' }
  }))($w('#allFilter'));
  connect(state => ({
    style: { borderColor: state.currentFilter === 'active' ? 'black' : 'white' }
  }))($w('#activeFilter'));
  connect(state => ({
    style: {
      borderColor: state.currentFilter === 'completed' ? 'black' : 'white'
    }
  }))($w('#completedFilter'));
  connect(state => ({ data: getTasks(state) }))($w('#taskList'));

  $w('#taskInput').onKeyPress(e => {
    if (e.key === 'Enter') {
      store.dispatch({
        type: 'ADD_TODO',
        id: `${++counter}`,
        text: e.target.value
      });
      e.target.value = '';
    }
  });
  $w('#checkAll').onChange(e =>
    store.dispatch({ type: 'CHECK_ALL', completed: e.target.checked })
  );
  $w('#clear').onClick(() => store.dispatch({ type: 'CLEAR_ALL' }));
  $w('#allFilter').onClick(() =>
    store.dispatch({ type: 'SET_FILTER', filter: 'all' })
  );
  $w('#activeFilter').onClick(() =>
    store.dispatch({ type: 'SET_FILTER', filter: 'active' })
  );
  $w('#completedFilter').onClick(() =>
    store.dispatch({ type: 'SET_FILTER', filter: 'completed' })
  );

  repeaterConnect($w('#taskList'), ($item, _id) => {
    const task = (state, id) => state.tasks.find(todo => todo._id === id);
    const decorate = (state, id) =>
      task(state, id).completed
        ? `<p><s>${task(state, id).description}</s></p>`
        : `<p>${task(state, id).description}</p>`;

    connect(state => ({
      html: decorate(state, _id),
      visible: state.editMode !== _id
    }))($item('#taskText'));
    connect(state => ({
      value: task(state, _id).description,
      visible: state.editMode === _id
    }))($item('#editTask'));
    connect(state => ({ checked: task(state, _id).completed }))(
      $item('#taskCheckbox')
    );

    $item('#taskText').onDblClick(e => {
      store.dispatch({ type: 'EDIT_TODO', id: e.context.itemId });
      setTimeout(() => $item('#editTask').focus(), 100);
    });
    $item('#editTask').onBlur(e =>
      store.dispatch({
        type: 'UPDATE_TODO',
        id: e.context.itemId,
        description: e.target.value
      })
    );
    $item('#editTask').onKeyPress(
      e =>
        e.key === 'Enter' &&
        store.dispatch({
          type: 'UPDATE_TODO',
          id: e.context.itemId,
          description: e.target.value
        })
    );
    $item('#taskCheckbox').onChange(e =>
      store.dispatch({
        type: 'TOGGLE_TODO',
        id: e.context.itemId,
        completed: e.target.checked
      })
    );
    $item('#delete').onClick(e =>
      store.dispatch({ type: 'DELETE_TODO', id: e.context.itemId })
    );
  });
});
```
