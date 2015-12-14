/**
 *  Messages logic
 *
 */
var Peerio = this.Peerio || {};

(function () {
    'use strict';

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    Peerio.Messages = {
        getAllConversations: getAllConversations,
        getConversation: getConversation
    };
    //--------------------------------------------------------------------------------------------------------------------

    function getAllConversations() {
        return Peerio.SqlQueries.getAllConversations()
            .then(res => {
                res = res.rows;
                var ret = [];
                for (var i = 0; i < res.length; i++) {
                    ret.push(Peerio.Conversation.fromLocalData(res.item(i)));
                }
                return ret;
            });
    }

    function getConversation(id) {
        return Promise.all([
                Peerio.SqlQueries.getConversation(id).then(res => Peerio.Conversation.fromLocalData(res.rows.item(0))),
                Peerio.SqlQueries.getMessages(id).then(res => {
                    res = res.rows;
                    var ret = [];
                    for (var i = 0; i < res.length; i++) {
                        ret.push(Peerio.Message.fromLocalData(res.item(i)));
                    }
                    return ret;
                })
            ])
            .spread(function (conversation, messages) {
                conversation.messages = messages;
                return conversation;
            })
    }


})();

