/* global $w: true */
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
      return state.map((todo) =>
        todo._id === action.id
          ? { ...todo, description: action.description }
          : todo,
      );
    case 'DELETE_TODO':
      return state.filter((todo) => todo._id !== action.id);
    default:
      return state;
  }
}

global.$w = { onReady: (fn) => (global.$w.ready = fn) };

describe('corvid-redux', () => {
  it('should bind objects', async () => {
    const component = {};
    const store = createStore(counter);
    const { connect, pageConnect } = createConnect(store);
    pageConnect(() => {
      connect((state) => ({ text: `${state}` }))(component);
    });

    await $w.ready();
    expect(component.text).toEqual('0');

    store.dispatch({ type: 'INCREMENT' });
    expect(component.text).toEqual('1');
    store.dispatch({ type: 'DECREMENT' });
    expect(component.text).toEqual('0');
  });

  it('should not update things that did not change', async () => {
    const component = {};
    const store = createStore(counter);
    const { connect, pageConnect } = createConnect(store);
    pageConnect(() => {
      connect((state) => ({ text: `${state}` }))(component);
    });

    await $w.ready();
    expect(component.text).toEqual('0');

    component.text = 'dirty';
    store.dispatch({ type: '_DUMMY' });
    expect(component.text).toEqual('dirty');
    store.dispatch({ type: 'INCREMENT' });
    expect(component.text).toEqual('1');
    store.dispatch({ type: 'DECREMENT' });
    expect(component.text).toEqual('0');
  });

  it('should bind visibility', async () => {
    const component = {
      show: () => (component.hidden = false),
      hide: () => (component.hidden = true),
    };
    const store = createStore(counter);
    const { connect, pageConnect } = createConnect(store);
    pageConnect(() => {
      connect((state) => ({ visible: state > 0 }))(component);
    });

    await $w.ready();
    expect(component.hidden).toEqual(true);

    store.dispatch({ type: 'INCREMENT' });
    expect(component.hidden).toEqual(false);
    store.dispatch({ type: 'DECREMENT' });
    expect(component.hidden).toEqual(true);
  });

  it('should bind style', async () => {
    const style = {};
    const component = { style };
    const store = createStore(counter);
    const { connect, pageConnect } = createConnect(store);
    pageConnect(() => {
      connect((state) => ({ style: { border: state } }))(component);
    });

    await $w.ready();
    expect(component.style.border).toEqual(0);
    expect(component.style).toBe(style);

    store.dispatch({ type: 'INCREMENT' });
    expect(component.style.border).toEqual(1);
    expect(component.style).toBe(style);
    store.dispatch({ type: 'DECREMENT' });
    expect(component.style.border).toEqual(0);
    expect(component.style).toBe(style);
  });

  it('should bind repeaters', async () => {
    let onItemReadyFn, onItemRemovedFn;
    const repeater = {
      onItemReady: (fn) => (onItemReadyFn = fn),
      onItemRemoved: (fn) => (onItemRemovedFn = fn),
    };

    const store = createStore(todoList);
    const { connect, pageConnect, repeaterConnect } = createConnect(store);
    pageConnect(() => {
      repeaterConnect(repeater, ($item, _id) => {
        const task = (state, id) => state.find((todo) => todo._id === id);
        connect((state) => ({ text: task(state, _id).description }))(
          $item('#taskText'),
        );
      });
    });

    const components = [{}, {}];
    store.dispatch({
      type: 'ADD_TODO',
      id: '1',
      text: 'First Todo',
    });
    store.dispatch({
      type: 'ADD_TODO',
      id: '2',
      text: 'Second Todo',
    });

    await $w.ready();
    onItemReadyFn((x) => (x === '#taskText' ? components[0] : undefined), {
      _id: '1',
    });
    onItemReadyFn((x) => (x === '#taskText' ? components[1] : undefined), {
      _id: '2',
    });
    expect(components[0].text).toEqual('First Todo');
    expect(components[1].text).toEqual('Second Todo');

    store.dispatch({
      type: 'UPDATE_TODO',
      id: '1',
      description: 'First Todo Updated',
    });
    expect(components[0].text).toEqual('First Todo Updated');
    expect(components[1].text).toEqual('Second Todo');

    onItemRemovedFn({ _id: '1' });
    store.dispatch({
      type: 'UPDATE_TODO',
      id: '1',
      description: 'First Todo Updated Again',
    });
    store.dispatch({
      type: 'UPDATE_TODO',
      id: '2',
      description: 'Second Todo Updated',
    });
    // removed item no longer bound to changes
    expect(components[0].text).toEqual('First Todo Updated');
    expect(components[1].text).toEqual('Second Todo Updated');
  });

  it('should actually update repeaters after tick', async () => {
    let onItemReadyFn;
    const repeater = {
      onItemReady: (fn) => (onItemReadyFn = fn),
      onItemRemoved: () => undefined,
    };

    const store = createStore(todoList);
    const { connect, pageConnect, repeaterConnect } = createConnect(store);
    pageConnect(() => {
      connect((state) => ({ data: state }))({});
      repeaterConnect(repeater, ($item, _id) => {
        const task = (state, id) => state.find((todo) => todo._id === id);
        connect((state) => ({ text: task(state, _id).description }))(
          $item('#taskText'),
        );
      });
    });

    const component = {};
    store.dispatch({
      type: 'ADD_TODO',
      id: '1',
      text: 'First Todo',
    });

    await $w.ready();
    onItemReadyFn((x) => (x === '#taskText' ? component : undefined), {
      _id: '1',
    });
    expect(component.text).toEqual('First Todo');

    store.dispatch({
      type: 'UPDATE_TODO',
      id: '1',
      description: 'First Todo Updated',
    });
    expect(component.text).toEqual('First Todo');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(component.text).toEqual('First Todo Updated');
  });
});
