export const createSessionManager = ({ bridge, eventBus, chromeApi, config, utils }) => {
  const logger = utils?.nsLog || console.log;
  const STORAGE_KEY = 'notestash-sessions';
  const CURRENT_SESSION_KEY = 'notestash-current-session';

  async function init() {
    console.log('[SessionManager] init() called');
    try {
      const sessions = await getAllSessions();
      console.log('[SessionManager] init() - Found', sessions.length, 'sessions');
      if (sessions.length === 0) {
        console.log('[SessionManager] init() - No sessions, creating default...');
        await createSession('Default Session');
      }
      console.log('[SessionManager] init() - Complete');
    } catch (err) {
      console.error('[SessionManager] init() ERROR:', err);
    }
  }

  async function getAllSessions() {
    console.log('[SessionManager] getAllSessions() called');
    try {
      const result = await chromeApi?.storage?.get(STORAGE_KEY);
      const sessions = result?.[STORAGE_KEY] || [];
      console.log('[SessionManager] getAllSessions() - Returning', sessions.length, 'sessions');
      console.log('[SessionManager] getAllSessions() - Session IDs:', sessions.map(s => s.id));
      return sessions;
    } catch (err) {
      console.error('[SessionManager] getAllSessions() ERROR:', err);
      return [];
    }
  }

  async function getCurrentSession() {
    console.log('[SessionManager] getCurrentSession() called');
    try {
      const sessions = await getAllSessions();
      const currentIdResult = await chromeApi?.storage?.get(CURRENT_SESSION_KEY);
      const currentId = currentIdResult?.[CURRENT_SESSION_KEY];
      console.log('[SessionManager] getCurrentSession() - Current ID:', currentId);
      
      if (currentId) {
        const session = sessions.find(s => s.id === currentId);
        if (session) {
          console.log('[SessionManager] getCurrentSession() - Found session:', session.name, '| content length:', session.content?.length || 0, '| clipCount:', session.clipCount);
          console.log('[SessionManager] getCurrentSession() - Session content preview:', session.content?.substring(0, 200));
          return session;
        } else {
          console.warn('[SessionManager] getCurrentSession() - Session ID', currentId, 'not found in sessions array');
        }
      }
      
      const fallback = sessions[0];
      if (fallback) {
        console.log('[SessionManager] getCurrentSession() - Using fallback (first session):', fallback.name);
      } else {
        console.warn('[SessionManager] getCurrentSession() - No sessions available!');
      }
      return fallback;
    } catch (err) {
      console.error('[SessionManager] getCurrentSession() ERROR:', err);
      return null;
    }
  }

  async function createSession(name) {
    console.log('[SessionManager] createSession() called with name:', name);
    try {
      const sessions = await getAllSessions();
      
      const newSession = {
        id: utils?.generateId() || Date.now().toString(),
        name: name || `Session ${sessions.length + 1}`,
        content: '',
        created: new Date().toISOString(),
        clipCount: 0,
        clips: [],
        images: [],
        screenshots: {},
        clipMetadata: {},
        cachedHtml: {},
        nextSnippetId: 1
      };

      console.log('[SessionManager] createSession() - New session ID:', newSession.id);
      sessions.push(newSession);
      
      console.log('[SessionManager] createSession() - Saving', sessions.length, 'sessions to storage...');
      await chromeApi?.storage?.set({ [STORAGE_KEY]: sessions });
      await chromeApi?.storage?.set({ [CURRENT_SESSION_KEY]: newSession.id });
      
      console.log('[SessionManager] createSession() - Verifying save...');
      const verifyResult = await chromeApi?.storage?.get(STORAGE_KEY);
      const verifySessions = verifyResult?.[STORAGE_KEY] || [];
      console.log('[SessionManager] createSession() - Verification: found', verifySessions.length, 'sessions');
      
      eventBus?.emit('session:created', newSession);
      console.log('[SessionManager] createSession() - Complete');
      return newSession;
    } catch (err) {
      console.error('[SessionManager] createSession() ERROR:', err);
      throw err;
    }
  }

  async function switchSession(sessionId) {
    console.log('[SessionManager] switchSession() called with ID:', sessionId);
    try {
      const sessions = await getAllSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) {
        console.error('[SessionManager] switchSession() - Session not found:', sessionId);
        throw new Error('Session not found');
      }
      
      console.log('[SessionManager] switchSession() - Switching to:', session.name);
      await chromeApi?.storage?.set({ [CURRENT_SESSION_KEY]: sessionId });
      eventBus?.emit('session:switched', session);
      console.log('[SessionManager] switchSession() - Complete');
      return session;
    } catch (err) {
      console.error('[SessionManager] switchSession() ERROR:', err);
      throw err;
    }
  }

  async function renameSession(sessionId, newName) {
    console.log('[SessionManager] renameSession() called:', sessionId, '->', newName);
    try {
      const sessions = await getAllSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (!session) {
        console.error('[SessionManager] renameSession() - Session not found:', sessionId);
        throw new Error('Session not found');
      }
      
      const oldName = session.name;
      session.name = newName;
      
      await chromeApi?.storage?.set({ [STORAGE_KEY]: sessions });
      console.log('[SessionManager] renameSession() - Renamed:', oldName, '->', newName);
      eventBus?.emit('session:renamed', { sessionId, oldName, newName });
      return session;
    } catch (err) {
      console.error('[SessionManager] renameSession() ERROR:', err);
      throw err;
    }
  }

  async function deleteSession(sessionId) {
    console.log('[SessionManager] === deleteSession() START ===');
    console.log('[SessionManager] deleteSession() - Session ID:', sessionId);
    try {
      let sessions = await getAllSessions();
      const sessionToDelete = sessions.find(s => s.id === sessionId);
      
      if (!sessionToDelete) {
        console.error('[SessionManager] deleteSession() - Session not found:', sessionId);
        throw new Error('Session not found');
      }
      
      sessions = sessions.filter(s => s.id !== sessionId);
      await chromeApi?.storage?.set({ [STORAGE_KEY]: sessions });
      console.log('[SessionManager] deleteSession() - Deleted, remaining:', sessions.length);
      
      const currentIdResult = await chromeApi?.storage?.get(CURRENT_SESSION_KEY);
      if (currentIdResult?.[CURRENT_SESSION_KEY] === sessionId) {
        console.log('[SessionManager] deleteSession() - Was current session, switching...');
        if (sessions.length > 0) {
          await switchSession(sessions[0].id);
        } else {
          await createSession('Default Session');
        }
      }
      
      eventBus?.emit('session:deleted', sessionToDelete);
      console.log('[SessionManager] === deleteSession() END ===');
      return sessions;
    } catch (err) {
      console.error('[SessionManager] deleteSession() ERROR:', err);
      console.error('[SessionManager] deleteSession() ERROR stack:', err.stack);
      throw err;
    }
  }

  async function updateSession(sessionId, updates) {
    console.log('[SessionManager] updateSession() called:', sessionId, 'with keys:', Object.keys(updates));
    try {
      const sessions = await getAllSessions();
      const index = sessions.findIndex(s => s.id === sessionId);
      
      if (index === -1) {
        console.error('[SessionManager] updateSession() - Session not found:', sessionId);
        throw new Error('Session not found');
      }
      
      sessions[index] = { ...sessions[index], ...updates };
      await chromeApi?.storage?.set({ [STORAGE_KEY]: sessions });
      console.log('[SessionManager] updateSession() - Updated session');
      return sessions[index];
    } catch (err) {
      console.error('[SessionManager] updateSession() ERROR:', err);
      throw err;
    }
  }

  async function saveCurrentSession(session) {
    console.log('[SessionManager] === saveCurrentSession() START ===');
    console.log('[SessionManager] saveCurrentSession() - Session ID:', session?.id);
    console.log('[SessionManager] saveCurrentSession() - Session name:', session?.name);
    console.log('[SessionManager] saveCurrentSession() - Content length:', session?.content?.length || 0);
    console.log('[SessionManager] saveCurrentSession() - Clip count:', session?.clipCount);
    console.log('[SessionManager] saveCurrentSession() - Images:', session?.images?.length || 0);
    console.log('[SessionManager] saveCurrentSession() - Content preview:', session?.content?.substring(0, 300));
    
    if (!session || !session.id) {
      console.error('[SessionManager] saveCurrentSession() - INVALID SESSION:', session);
      throw new Error('Invalid session');
    }
    
    try {
      const sessions = await getAllSessions();
      console.log('[SessionManager] saveCurrentSession() - Found', sessions.length, 'existing sessions');
      
      const index = sessions.findIndex(s => s.id === session.id);
      console.log('[SessionManager] saveCurrentSession() - Session index in array:', index);
      
      if (index === -1) {
        console.error('[SessionManager] saveCurrentSession() - Session not found in array! ID:', session.id);
        console.log('[SessionManager] saveCurrentSession() - Available IDs:', sessions.map(s => s.id));
        throw new Error('Session not found');
      }
      
      sessions[index] = session;
      console.log('[SessionManager] saveCurrentSession() - Setting storage with', sessions.length, 'sessions...');
      
      await chromeApi?.storage?.set({ [STORAGE_KEY]: sessions });
      console.log('[SessionManager] saveCurrentSession() - Storage set complete');
      
      console.log('[SessionManager] saveCurrentSession() - Verifying save...');
      const verifyResult = await chromeApi?.storage?.get(STORAGE_KEY);
      const verifySessions = verifyResult?.[STORAGE_KEY] || [];
      const verifySession = verifySessions.find(s => s.id === session.id);
      
      if (verifySession) {
        console.log('[SessionManager] saveCurrentSession() - VERIFIED: Session found in storage');
        console.log('[SessionManager] saveCurrentSession() - Verified content length:', verifySession.content?.length || 0);
        console.log('[SessionManager] saveCurrentSession() - Verified clipCount:', verifySession.clipCount);
      } else {
        console.error('[SessionManager] saveCurrentSession() - VERIFICATION FAILED: Session not in storage!');
      }
      
      eventBus?.emit('session:updated', session);
      console.log('[SessionManager] === saveCurrentSession() END ===');
      return session;
    } catch (err) {
      console.error('[SessionManager] saveCurrentSession() ERROR:', err);
      console.error('[SessionManager] saveCurrentSession() ERROR stack:', err.stack);
      throw err;
    }
  }

  async function clearCurrentSession() {
    console.log('[SessionManager] clearCurrentSession() called');
    try {
      const session = await getCurrentSession();
      if (session) {
        session.content = '# NoteStash\n\nStashed pages collection.\n';
        session.clipCount = 0;
        session.images = [];
        session.screenshots = {};
        session.cachedHtml = {};
        session.clipMetadata = {};
        await saveCurrentSession(session);
        console.log('[SessionManager] clearCurrentSession() - Session cleared');
      }
      return session;
    } catch (err) {
      console.error('[SessionManager] clearCurrentSession() ERROR:', err);
      throw err;
    }
  }

  async function deleteAllSessions() {
    console.log('[SessionManager] deleteAllSessions() called');
    try {
      await chromeApi?.storage?.set({ [STORAGE_KEY]: [] });
      await chromeApi?.storage?.remove(CURRENT_SESSION_KEY);
      const newSession = await createSession('Default Session');
      eventBus?.emit('sessions:all-deleted');
      return newSession;
    } catch (err) {
      console.error('[SessionManager] deleteAllSessions() ERROR:', err);
      throw err;
    }
  }

  console.log('[SessionManager] Module factory created');
  return {
    init,
    getAllSessions,
    getCurrentSession,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    updateSession,
    saveCurrentSession,
    clearCurrentSession,
    deleteAllSessions
  };
};
