/**
 * Recording Mode Module - Recording state management with auto-save
 * 
 * @module content/modules/recording/mode
 * @version 2.0.0
 */

export const createRecordingMode = ({ bridge, eventBus, chromeApi, config, state, utils, floatingButtons, clipCapture }) => {
  const logger = utils?.nsLog || console.log;
  let autoSaveInterval = null;
  const AUTO_SAVE_INTERVAL = 300000; // 5 minutes

  async function init() {
    try {
      const storage = await chromeApi?.storage?.get?.(['isRecording', 'recordingClipCount']);
      if (storage?.isRecording) {
        state?.set('isRecording', true);
        state?.set('recordingClipCount', storage.recordingClipCount || 0);
        startAutoSave();
        eventBus?.emit('recording:state-changed', { 
          isRecording: true, 
          clipCount: storage.recordingClipCount || 0 
        });
        logger('[RecordingMode] Restored recording state');
      }
    } catch (err) {
      logger('[RecordingMode] Error restoring state:', err);
    }
  }

  async function toggle() {
    const recording = state?.get('isRecording') || false;
    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
    return state?.get('isRecording');
  }

  async function startRecording() {
    state?.set('isRecording', true);
    state?.set('recordingClipCount', 0);
    state?.set('lastContentHash', '');

    await chromeApi?.storage?.set?.({ isRecording: true, recordingClipCount: 0 });

    startAutoSave();

    eventBus?.emit('recording:started');
    eventBus?.emit('recording:state-changed', { isRecording: true, clipCount: 0 });

    logger('[RecordingMode] Recording started - waiting for navigation');
  }

  async function stopRecording() {
    state?.set('isRecording', false);

    stopAutoSave();

    await chromeApi?.storage?.set?.({ isRecording: false });

    eventBus?.emit('recording:stopped');
    eventBus?.emit('recording:state-changed', { 
      isRecording: false, 
      clipCount: state?.get('recordingClipCount') || 0 
    });

    logger('[RecordingMode] Recording stopped');
  }

  /**
   * Start auto-save interval (5 min)
   */
  function startAutoSave() {
    stopAutoSave(); // Clear any existing interval
    
    autoSaveInterval = setInterval(async () => {
      try {
        const autoSaveEnabled = config?.get?.('autoSave') !== false;
        if (!autoSaveEnabled) return;
        
        const clipCount = state?.get('recordingClipCount') || 0;
        await chromeApi?.storage?.set?.({ recordingClipCount: clipCount });
        logger('[RecordingMode] Auto-saved recording state, clips:', clipCount);
      } catch (err) {
        logger('[RecordingMode] Auto-save error:', err);
      }
    }, AUTO_SAVE_INTERVAL);
    
    logger('[RecordingMode] Auto-save started (5min interval)');
  }

  function stopAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
      logger('[RecordingMode] Auto-save stopped');
    }
  }

  function isRecording() {
    return state?.get('isRecording') || false;
  }

  function getStats() {
    return {
      isRecording: state?.get('isRecording') || false,
      clipCount: state?.get('recordingClipCount') || 0,
      lastCaptureTime: state?.get('lastCaptureTime') || null
    };
  }

  function destroy() {
    stopAutoSave();
  }

  return {
    init,
    toggle,
    startRecording,
    stopRecording,
    isRecording,
    getStats,
    destroy
  };
};
