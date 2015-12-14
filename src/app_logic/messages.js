/**
 *  Messages logic
 *
 */
var Peerio = this.Peerio || {};

(function () {
    'use strict';

    //-- PUBLIC API ------------------------------------------------------------------------------------------------------
    Peerio.Messages = {
        getAllConversations: getAllConversations
    };
    //--------------------------------------------------------------------------------------------------------------------

    function getAllConversations(){
        return Peerio.SqlQueries.getAllConversations()
        .then(res => {
            res = res.rows;
            var ret = [];
            for(var i=0; i< res.length; i++){
                ret.push(Peerio.Conversation.fromLocalData(res.item(i)));
            }
            return ret;
        });
    }


})();

