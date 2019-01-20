import {cloneDeep, keys, pick} from 'lodash';
import Vue from 'vue'
import Vuex from 'vuex'
import {update} from './api';

Vue.use(Vuex)

const getUid = (() => {
    let id = 0;
    return () => id++;
})();

const delay = (timeout, success) => new Promise((resolve, reject) => {
    setTimeout(() => {
        if (success) {
            resolve();
        }
        else {
            reject();
        }
    }, timeout);
});

let actionQueue = [];
let snapshot = null;

/**
 * Action/Mutation前缀
 *
 * @const {string}
 */
const OPTMISTIC_PREFIX = '@optimistic/';

/**
 * Mutation - 更新状态
 *
 * @const {string}
 */
const UPDATE_MUTATION = `${OPTMISTIC_PREFIX}/UPDATE_MUTATION`;

/**
 * Mutation - 重置状态
 *
 * @const {string}
 */
const REVERT_MUTATION = `${OPTMISTIC_PREFIX}/REVERT_MUTATION`;

function createOptimisticModule({
    name,
    UPDATE_MUTATION,
    mutations,
    state,
    getters,
    actions
}) {
    let actionQueue = [];
    let snapshot = null;

    const REVERT_MUTATION_KEY = `${name}_REVERT_MUTATION`;
    const UPDATE_MUTATION_KEY = `${name}_UPDATE_MUTATION`;
    const UPDATE_ACTION_OPTIMIST_KEY = `${name}_UPDATE_ACTION_OPTIMIST`;

    return {
        state: {
            ...state
        },
        getters: {
            ...getters
        },
        mutations: {
            ...mutations,
           [UPDATE_MUTATION_KEY](...args) {
               UPDATE_MUTATION.apply(this, args);
           },
           [REVERT_MUTATION_KEY](state, snapshot) {
               Object.assign(state, snapshot);
           }
        },
        actions: {
            ...actions,
            [UPDATE_ACTION_OPTIMIST_KEY]({commit, state}, action) {
                const {optimist} = action;
                const {type, id} = optimist;
                let newActionQueue = [];
                let findOptAction = false;

                // 乐观更新
                if (type === 'BEGIN') {
                    if (!snapshot) {
                        snapshot = cloneDeep(state);
                    }
                    actionQueue.push(action);
                    commit(REVERT_MUTATION_KEY, action);
                }

                // 异步成功，提交更新替换乐观更新
                else if (type === 'COMMIT' || type === 'REVERT') {
                    // 回滚到之前的状态
                    if (snapshot) {
                        commit(REVERT_MUTATION_KEY, cloneDeep(snapshot));
                    }

                    actionQueue.forEach(pAction => {
                        if (pAction.optimist.type === 'BEGIN') {

                            // 一个组的Action，用现在的状态替换掉
                            if (id === pAction.optimist.id) {
                                commit(REVERT_MUTATION_KEY, action);
                                newActionQueue.push(action);
                            }
                            // 不是一个组的乐观更新，继续插进去
                            else {
                                // 乐观更新还没结束，保留snapshop
                                findOptAction = true;
                                commit(REVERT_MUTATION_KEY, pAction);
                                newActionQueue.push(pAction);
                            }
                        }
                        else {
                            commit(REVERT_MUTATION_KEY, pAction);
                            newActionQueue.push(pAction);
                        }
                    });

                    // 乐观更新结束，删除snapshop
                    if (!findOptAction) {
                        snapshot = null;
                        actionQueue = [];
                    }
                    else {
                        // 新的Acion队列
                        actionQueue = newActionQueue;
                    }
                }
            }
        }
    };
}

const items = {
        state: {
            items: []
        },
        getters: {
        items: state => {
            return state.items;
        }
    },
    mutations: {
        ADD_ITEM(state, action) {
            state.items.push(action.payload.item);
        },
        REVERT_ITEMS(state, snapshot) {
            Object.assign(state, snapshot);
        }
    },
    actions: {
        ADD_ITEM({dispatch, commit, state}, action) {
            const {payload, optimist} = action;
            const {type, id} = optimist;
            let newActionQueue = [];
            let findOptAction = false;

            // 乐观更新
            if (type === 'BEGIN') {
                if (!snapshot) {
                    snapshot = cloneDeep(state);
                }
                actionQueue.push(action);
                commit('ADD_ITEM', action);
            }

            // 异步成功，提交更新替换乐观更新
            else if (type === 'COMMIT' || tpye === 'REVERT') {
                // 回滚到之前的状态
                if (snapshot) {
                    commit('REVERT_ITEMS', cloneDeep(snapshot));
                }

                actionQueue.forEach(pAction => {
                    if (pAction.optimist.type === 'BEGIN') {

                        // 一个组的Action，用现在的状态替换掉
                        if (id === pAction.optimist.id) {
                            commit('ADD_ITEM', action);
                            newActionQueue.push(action);
                        }
                        // 不是一个组的乐观更新，继续插进去
                        else {
                            // 乐观更新还没结束，保留snapshop
                            findOptAction = true;
                            commit('ADD_ITEM', pAction);
                            newActionQueue.push(pAction);
                        }
                    }
                    else {
                        commit('ADD_ITEM', pAction);
                        newActionQueue.push(pAction);
                    }
                });

                // 乐观更新结束，删除snapshop
                if (!findOptAction) {
                    snapshot = null;
                    actionQueue = [];
                }
                else {
                    // 新的Acion队列
                    actionQueue = newActionQueue;
                }
            }
        },

        // 理想情况
        // 不用去管理ID和是否是OPTMIST Action
        async TEST_ADD({dispatch}, {payload}) {
            const {success, timeout} = options;
            const addItem = item => ({
                payload: {
                    item: {
                        ...item,
                        pending: true
                    }
                }
            });
            dispatch('ADD_ITEM', addItem(payload.item));
            try {
                await delay(timeout * 1000, success);
                dispatch('ADD_ITEM', addItem({...payload.item}));
            }
            catch (ex) {
                console.error('Add failed');
                dispatch('ADD_ITEM', addItem({
                    ...payload.item,
                    error: true
                }));
            }
        },

        async ADD_ITEM_OPTMISTIC({dispatch}, {payload, options}) {
            const {success, timeout} = options;
            const item = payload.item;
            const id = getUid();

            dispatch('ADD_ITEM', {
                payload: {
                    item: {
                        ...item,
                        pending: true,
                        error: false
                    }
                },
                optimist: {
                    type: 'BEGIN',
                    id
                }
            });

            try {
                await delay(timeout * 1000, success);
                dispatch('ADD_ITEM', {
                    payload: {
                        item: {
                            ...item,
                            pending: false,
                            error: false
                        }
                    },
                    optimist: {
                        type: 'COMMIT',
                        id
                    }
                });
            }
            catch (ex) {
                dispatch('ADD_ITEM', {
                    payload: {
                        item: {
                            ...item,
                            error: true,
                            pending: false
                        }
                    },
                    optimist: {
                        type: 'COMMIT',
                        id
                    }
                });
            }
        }
    }
};

export default new Vuex.Store({
  strict: true,
    modules: {
      items
    },
  state: {
      name: {
          value: '123',
          error: false,
          pending: false
      },
      live: {
          value: false,
          error: false,
          pending: false
      }
  },

  mutations: {
      UPDATE_FORM(state, payload) {
          Object.assign(state, payload);
      },
  },
  actions: {
      updateFormAction(context, [normalAction, optAction]) {
          const uid = getUid();
          normalAction(context);
          optAction(context);

          // const previousState = pick(cloneDeep(state.formData), keys(value));
          // console.log('previousState', previousState);
          // commit('UPDATE_FORM_OPTIMISTIC', value, previousState);
          // try {
          //     await update(value);
          //     commit('UPDATE_FORM_SUCCESS', value);
          // }
          // catch (ex) {
          //     commit('UPDATE_FORM_FAILED', previousState);
          // }
      }
  }
})
