/* global $w */
function updateProp(comp, prop, value) {
  if (prop === 'visible') {
    const hidden = !value;
    if (hidden && !comp.hidden) {
      comp.hide();
    } else if (!hidden && comp.hidden) {
      comp.show();
    }
  } else if (prop === 'style') {
    Object.assign(comp[prop], value);
  } else {
    comp[prop] = value;
    //if repeater changed, delay further updates until redundant items are removed
    return prop === 'data';
  }
}

export function createConnect(store) {
  let connected = [],
    pageConnecting,
    currentRepeater;

  store.subscribe(() => {
    const state = store.getState();
    for (const x of connected) {
      const props = x.mapStateToProps(state);
      let continueLater = false;
      Object.keys(props)
        .filter(k => props[k] !== x.prevProps[k])
        .forEach(k => {
          continueLater = continueLater || updateProp(x.comp, k, props[k]);
        });
      x.prevProps = props;
      if (continueLater && !pageConnecting) {
        setTimeout(() => store.dispatch({ type: '_DUMMY' }), 0);
        return;
      }
    }
  });

  const connect = mapStateToProps => {
    return comp => {
      if (mapStateToProps) {
        const connecting = { comp, mapStateToProps, prevProps: {} };
        connected.push(connecting);
        if (currentRepeater) {
          currentRepeater.push(connecting);
        }
      }
    };
  };

  const repeaterConnect = (repeater, fn) => {
    const thisConnected = {};
    repeater.onItemReady(($item, { _id }) => {
      thisConnected[_id] = thisConnected[_id] || [];
      currentRepeater = thisConnected[_id];
      fn($item, _id);
      currentRepeater = undefined;
      store.dispatch({ type: '_DUMMY' });
    });
    repeater.onItemRemoved(({ _id }) => {
      connected = connected.filter(x => !thisConnected[_id].includes(x));
    });
  };

  const pageConnect = fn => {
    $w.onReady(async () => {
      pageConnecting = true;
      await fn({ store, connect, repeaterConnect });
      pageConnecting = false;
      store.dispatch({ type: '_DUMMY' });
    });
  };

  return { connect, repeaterConnect, pageConnect };
}
