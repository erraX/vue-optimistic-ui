<template>
    <div class="hello">
        <div>
            Timeout:
            <span v-for="item in timeoutOptions" :key="item.value">
                <input type="radio" :value="item.value" v-model="timeout"/>
                <label :for="item.value">{{item.text}}</label>
            </span>
        </div>
        <div>
            Success:
            <input type="checkbox" v-model="success"/>
        </div>
        <div class="list-input">
            <input type="text" v-model="inputItemName">
            <button @click="onAdd">Add</button>
        </div>
        <div class="list">
            <p v-for="(item, idx) in items" :key="idx" :style="getItemStyle(item)">
                text: {{item.text}},
                pending: {{item.pending}},
                error: {{item.error}}
            </p>
        </div>
    </div>
</template>

<script>
    import {mapActions, mapState, mapGetters} from 'vuex';
    import {update} from '../api';

    const getUid = (() => {
        let id = 0;
        return () => id++;
    });

    export default {
        name: 'HelloWorld',
        props: {
            msg: String
        },
        data() {
            return {
                timeout: 1,
                inputItemName: '',
                success: true,
                timeoutOptions: [
                    {text: '1s', value: 1},
                    {text: '3s', value: 3},
                    {text: '5s', value: 5},
                    {text: '10s', value: 10}
                ]
            };
        },
        computed: {
            ...mapGetters([
                'items',
            ]),
        },
        methods: {
            ...mapActions([
                'ADD_ITEM_OPTMISTIC'
            ]),
            getItemStyle({pending, error}) {
                if (error) {
                    return {
                        color: 'red'
                    };
                }

                if (pending) {
                    return {
                        color: '#cecece'
                    }
                }

                return {};
            },
            onAdd() {
                console.log('Add item', this.inputItemName);
                this.ADD_ITEM_OPTMISTIC({
                    payload: {
                        item: {
                            text: this.inputItemName
                        }
                    },
                    options: {
                        timeout: this.timeout,
                        success: this.success
                    }
                });
                this.inputItemName = '';
            },
            async onNameBlur({target}) {
                const id = getUid();
                this.updateFormAction({
                    payload: {
                        name: target.value,
                        pending: true,
                        error: false
                    },
                    optimistic: {
                        type: 'BEGIN',
                        id
                    }
                });

                try {
                    await update({name: target.value});
                    this.updateFormAction({
                        payload: {
                            name: target.value,
                            pending: false,
                            error: false
                        },
                        optimistic: {
                            type: 'COMMIT',
                            id
                        }
                    });
                }
                catch (ex) {
                    this.updateFormAction({
                        payload: {
                            name: target.value,
                            pending: false,
                            error: true
                        },
                        optimistic: {
                            type: 'REVERT',
                            id
                        }
                    });
                }

                // this.updateFormAction([
                //     async ({dispatch, commit}) => {
                //         try {
                //             await update({name: target.value});
                //             commit('UPDATE_FORM', {
                //                 name: {
                //                     value: target.value,
                //                     error: false,
                //                     pending: false
                //                 }
                //             })
                //         }
                //         catch (ex) {
                //             console.log('update name error', ex);
                //         }
                //     },
                //     ({commit}) => {
                //         commit('UPDATE_FORM', {
                //             name: {
                //                 value: target.value,
                //                 error: false,
                //                 pending: true
                //             }
                //         })
                //     }
                // ]);
            },
            onLiveChange({target}) {
                this.updateFormAction([
                    async ({dispatch, commit}) => {
                        try {
                            await update({live: target.value});
                            commit('UPDATE_FORM', {
                                live: {
                                    value: target.value,
                                    error: false,
                                    pending: false
                                }
                            })
                        }
                        catch (ex) {
                            console.log('update name error', ex);
                        }
                    },
                    ({commit}) => {
                        commit('UPDATE_FORM', {
                            live: {
                                value: target.checked,
                                error: false,
                                pending: true
                            }
                        })
                    }
                ]);
            }
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
    h3 {
        margin: 40px 0 0;
    }

    ul {
        list-style-type: none;
        padding: 0;
    }

    li {
        display: inline-block;
        margin: 0 10px;
    }

    a {
        color: #42b983;
    }
</style>
