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
        getConversation: getConversation,
        getConversationFileIds: getConversationFileIds,
        getConversationMessageCount:getConversationMessageCount
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

    function getConversation(id, withoutMessages) {
        return Promise.all([
                Peerio.SqlQueries.getConversation(id).then(res => Peerio.Conversation.fromLocalData(res.rows.item(0))),
                withoutMessages ? null : Peerio.SqlQueries.getMessages(id).then(res => {
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

    var emptyArr = [];

    function getConversationFileIds(id) {

        return Peerio.SqlQueries.getConversationFiles(id)
            .then(res=> {
                res = res.rows;
                var ids = [];
               // var push = ids.push.bind(ids);
                for (var i = 0; i < res.length; i++) {
                    (JSON.parse(res.item(i).files) || emptyArr).forEach(ids.push);
                }
                return _.uniq(ids);
            });
    }

    function getConversationMessageCount(id) {
        return Peerio.SqlQueries.getConversationMessageCount(id)
            .then(res=> res.rows.item(0).msgCount);
    }


})();

