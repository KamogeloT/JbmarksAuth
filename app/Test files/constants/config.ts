// JBmarks App Configuration
export const Config = {
  // App Info
  appName: 'JBmarks',
  appVersion: '1.0.0',
  
  // Bitrix24 Configuration
  bitrix24: {
    portalUrl: 'https://jbmarks.sdinmotion.co.za',
    
    // OAuth Configuration (for direct OAuth flow)
    clientId: 'local.69526f981da4a0.86875975',
    clientSecret: 'z415SRiZn3BPkBiP7AApWUWsM7f37oCzLz3wFdTO53r2alqKqU',
    redirectUri: 'jbmarks://oauth/callback', // Deep link for mobile app
    
    // Legacy webhook (for admin/testing only - not for production user login)
    webhookUserId: '1',
    webhookToken: 'accwtpjw1vnywkss',
    
    // API Endpoints
    endpoints: {
      // Authentication
      auth: '/oauth/authorize',
      token: '/oauth/token',
      
      // Chat/Messaging
      messageAdd: '/rest/im.message.add',
      messageGet: '/rest/im.dialog.messages.get',
      chatAdd: '/rest/im.chat.add',
      chatGet: '/rest/im.chat.get',
      chatList: '/rest/im.recent.list',
      dialogGet: '/rest/im.dialog.get',
      
      // Tasks
      taskAdd: '/rest/tasks.task.add',
      taskUpdate: '/rest/tasks.task.update',
      taskGet: '/rest/tasks.task.get',
      taskList: '/rest/tasks.task.list',
      taskComplete: '/rest/tasks.task.complete',
      taskStart: '/rest/tasks.task.start',
      taskPause: '/rest/tasks.task.pause',
      taskDelegate: '/rest/tasks.task.delegate',
      taskDelete: '/rest/tasks.task.delete',
      
      // Kanban Stages
      stagesGet: '/rest/task.stages.get',
      stagesMoveTask: '/rest/task.stages.movetask',
      
      // Notifications
      notifyPersonal: '/rest/im.notify.personal.add',
      notifySystem: '/rest/im.notify.system.add',
      notifyRead: '/rest/im.notify.read',
      notifyDelete: '/rest/im.notify.delete',
      
      // Files/Attachments
      fileUpload: '/rest/disk.folder.uploadfile',
      taskFilesAttach: '/rest/tasks.task.files.attach',
      
      // Users
      userCurrent: '/rest/user.current',
      userGet: '/rest/user.get',
      userList: '/rest/user.search',
      
      // Push Notifications
      pushAdd: '/rest/pull.application.push.add',
    },
  },
  
  // Storage Keys
  storage: {
    accessToken: 'jbmarks_access_token',
    refreshToken: 'jbmarks_refresh_token',
    user: 'jbmarks_user',
    settings: 'jbmarks_settings',
  },
  
  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 50,
  },
};

export default Config;
