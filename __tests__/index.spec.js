import { createConnect } from '../src/index';
import { createStore } from 'redux';

function counter(state = 0, action) {
  switch (action.type) {
    case 'INCREMENT':
      return state + 1;
    case 'DECREMENT':
      return state - 1;
    default:
      return state;
  }
}

function todoList(state = [], action) {
  switch (action.type) {
    case 'ADD_TODO':
      return state.concat({ _id: action.id, description: action.text });
    case 'UPDATE_TODO':
      return state.map(todo =>
        todo._id === action.id
          ? { ...todo, description: action.description }
          : todo,
      );
    case 'DELETE_TODO':
      return state.filter(todo => todo._id !== action.id);
    default:
      return state;
  }
}

describe('corvid-redux', () => {
  it('should bind objects', async () => {
    const component = {};
    const store = createStore(counter);
    const { connect } = createConnect(store);
    connect(state => ({ text: `${state}` }))(component);

    expect(component.text).toEqual(undefined);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(component.text).toEqual('0');

    store.dispatch({ type: 'INCREMENT' });
    expect(component.text).toEqual('1');
    store.dispatch({ type: 'DECREMENT' });
    expect(component.text).toEqual('0');
  });

  it('should bind repeaters', async () => {
    let onItemReadyFn, onItemRemovedFn;
    const repeater = {
      onItemReady: fn => (onItemReadyFn = fn),
      onItemRemoved: fn => (onItemRemovedFn = fn),
    };

    const store = createStore(todoList);
    const { connect, repeaterConnect } = createConnect(store);
    repeaterConnect(repeater, ($item, _id) => {
      const task = (state, id) => state.find(todo => todo._id === id);
      connect(state => ({ text: task(state, _id).description }))(
        $item('#taskText'),
      );
    });

    const component = {};
    store.dispatch({
      type: 'ADD_TODO',
      id: '1',
      text: 'First Todo',
    });
    onItemReadyFn(x => (x === '#taskText' ? component : undefined), {
      _id: '1',
    });

    expect(component.text).toEqual(undefined);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(component.text).toEqual('First Todo');

    store.dispatch({
      type: 'UPDATE_TODO',
      id: '1',
      description: 'First Todo Updated',
    });
    expect(component.text).toEqual('First Todo Updated');

    onItemRemovedFn({ _id: '1' });
    store.dispatch({
      type: 'UPDATE_TODO',
      id: '1',
      description: 'First Todo Updated Again',
    });
    //no longer bound to changes
    expect(component.text).toEqual('First Todo Updated');
  });
});
