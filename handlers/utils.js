const registerCallHandlers = require("./callHandlers");
const registerRoomHandlers = require("./roomHandlers");
const registerChatHandlers = require("./chatHandlers");
const registerNotificationHandlers = require("./notificationHandlers");
const registerFriendsRequestHandlers = require("./friendsRequestHandlers");
const registerUnreadMessagesHandlers = require("./unreadMessagesHandlers");
const registerCommentHandlers = require("./commentHandlers");
const registerWebRTCHandlers = require("./webRTCHandlers");


module.exports = {
  registerCallHandlers,
  registerRoomHandlers,
  registerChatHandlers,
  registerNotificationHandlers,
  registerFriendsRequestHandlers,
  registerUnreadMessagesHandlers,
  registerCommentHandlers,
  registerWebRTCHandlers, 
};

