import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '@constants/colors';
import { useTaskStore, useAuthStore } from '@store';
import { LoadingSpinner, Button } from '@components/common';
import { TaskPriority, KanbanStage, TaskFile, TaskComment } from '@types';
import { takePhotoAndUpload, pickImageAndUpload } from '@services/api/files';

const CloseIcon = ({ color = Colors.textPrimary }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CheckIcon = ({ color = Colors.textInverse }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlayIcon = ({ color = Colors.textInverse }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M5 3l14 9-14 9V3z" fill={color} />
  </Svg>
);

const TrashIcon = ({ color = Colors.error }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronDownIcon = ({ color = Colors.textMuted }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SendIcon = ({ color = Colors.textInverse }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function TaskDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = (route.params as { id?: string }) || {};
  const isNewTask = false; // Users cannot create new tasks/complaints
  
  const { user } = useAuthStore();
  const { 
    selectedTask, 
    stages,
    comments,
    fetchTask, 
    updateTask, 
    deleteTask,
    completeTask, 
    startTask,
    fetchStages,
    moveTaskToStage,
    fetchComments,
    addComment,
    loading 
  } = useTaskStore();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [deadline, setDeadline] = useState('');
  const [isEditing, setIsEditing] = useState(isNewTask);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<TaskFile | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentFiles, setCommentFiles] = useState<number[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      const taskId = parseInt(id);
      fetchTask(taskId);
      fetchComments(taskId);
    }
  }, [id]);

  // Fetch Kanban stages when task is loaded (to get groupId for stage selection)
  useEffect(() => {
    if (selectedTask) {
      // Fetch stages for the task's group (or global if no group)
      fetchStages(selectedTask.groupId);
    }
  }, [selectedTask?.id, selectedTask?.groupId]);

  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title);
      setDescription(selectedTask.description || '');
      setPriority(selectedTask.priority);
      setDeadline(selectedTask.deadline || '');
    }
  }, [selectedTask]);

  const handleSave = async () => {
    try {
      if (!title.trim()) {
        Alert.alert('Error', 'Please enter a complaint title');
        return;
      }

      if (selectedTask) {
        await updateTask(selectedTask.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          deadline: deadline || undefined,
        });
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error('Error saving complaint:', error);
      Alert.alert('Error', error.message || 'Failed to save complaint. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (selectedTask) {
                await deleteTask(selectedTask.id);
                navigation.goBack();
              }
            } catch (error: any) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', error.message || 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleComplete = async () => {
    try {
      if (selectedTask && selectedTask.status !== 'COMPLETED') {
        await completeTask(selectedTask.id);
      }
    } catch (error: any) {
      console.error('Error completing complaint:', error);
      Alert.alert('Error', error.message || 'Failed to complete complaint');
    }
  };

  const handleStart = async () => {
    try {
      if (selectedTask && selectedTask.status !== 'IN_PROGRESS') {
        await startTask(selectedTask.id);
      }
    } catch (error: any) {
      console.error('Error starting complaint:', error);
      Alert.alert('Error', error.message || 'Failed to start complaint');
    }
  };

  const handleStageChange = async (stage: KanbanStage) => {
    try {
      if (!selectedTask) return;
      
      setShowStagePicker(false);
      await moveTaskToStage(selectedTask.id, stage.id);
      // Task is already refreshed in moveTaskToStage
    } catch (error: any) {
      console.error('Error changing task stage:', error);
      Alert.alert('Error', error.message || 'Failed to change task status');
    }
  };

  const getCurrentStage = (): KanbanStage | null => {
    if (!selectedTask || !stages.length) return null;
    return stages.find(s => s.id === selectedTask.stageId) || null;
  };

  const isImageFile = (file: TaskFile): boolean => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    return imageTypes.includes(file.type.toLowerCase()) || imageExtensions.includes(extension);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFilePress = async (file: TaskFile) => {
    if (isImageFile(file)) {
      setSelectedImage(file);
    } else {
      // Open file URL in browser or download
      if (file.url) {
        try {
          const canOpen = await Linking.canOpenURL(file.url);
          if (canOpen) {
            await Linking.openURL(file.url);
          } else {
            Alert.alert('Error', 'Cannot open this file. Please download it from Bitrix24.');
          }
        } catch (error: any) {
          console.error('Error opening file:', error);
          Alert.alert('Error', 'Failed to open file. Please try again.');
        }
      } else {
        Alert.alert('Error', 'File URL not available');
      }
    }
  };

  const handleAttachPhoto = async () => {
    if (!selectedTask) return;
    
    try {
      setUploadingFile(true);
      const fileResult = await takePhotoAndUpload();
      setCommentFiles([...commentFiles, fileResult.id]);
      Alert.alert('Success', 'Photo attached to comment');
    } catch (error: any) {
      console.error('Error attaching photo:', error);
      Alert.alert('Error', error.message || 'Failed to attach photo');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAttachImage = async () => {
    if (!selectedTask) return;
    
    try {
      setUploadingFile(true);
      const fileResult = await pickImageAndUpload();
      setCommentFiles([...commentFiles, fileResult.id]);
      Alert.alert('Success', 'Image attached to comment');
    } catch (error: any) {
      console.error('Error attaching image:', error);
      Alert.alert('Error', error.message || 'Failed to attach image');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSendComment = async () => {
    if (!selectedTask || (!commentText.trim() && commentFiles.length === 0)) {
      Alert.alert('Error', 'Please enter a comment or attach a file');
      return;
    }

    try {
      await addComment({
        taskId: selectedTask.id,
        text: commentText.trim() || '📎',
        files: commentFiles.length > 0 ? commentFiles : undefined,
      });
      setCommentText('');
      setCommentFiles([]);
      // Refresh comments to show the new one
      await fetchComments(selectedTask.id);
    } catch (error: any) {
      console.error('Error sending comment:', error);
      Alert.alert('Error', error.message || 'Failed to send comment');
    }
  };

  const formatCommentTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && !selectedTask) {
    return <LoadingSpinner fullScreen message="Loading complaint..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <CloseIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Complaint' : 'Complaint Details'}
        </Text>
        <View style={styles.headerRight}>
          {!isNewTask && !isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter complaint title"
              placeholderTextColor={Colors.textMuted}
              editable={isEditing}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter complaint description"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              editable={isEditing}
            />
          </View>

          {/* Priority */}
          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
              {(['LOW', 'NORMAL', 'HIGH'] as TaskPriority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOption,
                    priority === p && styles.priorityOptionActive,
                    p === 'HIGH' && priority === p && styles.priorityHigh,
                    p === 'LOW' && priority === p && styles.priorityLow,
                  ]}
                  onPress={() => isEditing && setPriority(p)}
                  disabled={!isEditing}
                >
                  <Text style={[
                    styles.priorityText,
                    priority === p && styles.priorityTextActive,
                  ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status/Stage Selection */}
          {!isNewTask && selectedTask && (
            <View style={styles.field}>
              <Text style={styles.label}>Status</Text>
              {stages.length > 0 ? (
                <TouchableOpacity
                  style={styles.stageSelector}
                  onPress={() => setShowStagePicker(true)}
                  disabled={isEditing}
                >
                  <View style={[
                    styles.stageBadge,
                    getCurrentStage() && { backgroundColor: getCurrentStage()!.color + '20' }
                  ]}>
                    <View style={[
                      styles.stageColorIndicator,
                      getCurrentStage() && { backgroundColor: getCurrentStage()!.color }
                    ]} />
                    <Text style={styles.stageText}>
                      {getCurrentStage()?.title || selectedTask.status.replace('_', ' ')}
                    </Text>
                  </View>
                  {!isEditing && <ChevronDownIcon />}
                </TouchableOpacity>
              ) : (
                <View style={styles.statusContainer}>
                  <View style={[
                    styles.statusBadge,
                    selectedTask.status === 'COMPLETED' && styles.statusCompleted,
                    selectedTask.status === 'IN_PROGRESS' && styles.statusProgress,
                  ]}>
                    <Text style={styles.statusText}>
                      {selectedTask.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Files/Attachments Section */}
          {!isNewTask && selectedTask && selectedTask.files && selectedTask.files.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>Attachments ({selectedTask.files.length})</Text>
              <View style={styles.filesContainer}>
                {selectedTask.files.map((file) => {
                  const isImage = isImageFile(file);
                  return (
                    <TouchableOpacity
                      key={file.id}
                      style={styles.fileItem}
                      onPress={() => handleFilePress(file)}
                    >
                      {isImage ? (
                        <Image
                          source={{ uri: file.url }}
                          style={styles.fileThumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.fileIcon}>
                          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                              stroke={Colors.textSecondary}
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <Path
                              d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                              stroke={Colors.textSecondary}
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        </View>
                      )}
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Text style={styles.fileSize}>
                          {formatFileSize(file.size)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Comments Section */}
          {!isNewTask && selectedTask && (
            <View style={styles.field}>
              <Text style={styles.label}>Comments ({comments.length})</Text>
              
              {/* Comments List */}
              {comments.length > 0 && (
                <View style={styles.commentsList}>
                  {comments.map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>
                          {comment.author?.name || `User ${comment.authorId}`}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatCommentTime(comment.date)}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      
                      {/* Comment Files */}
                      {comment.files && comment.files.length > 0 && (
                        <View style={styles.commentFiles}>
                          {comment.files.map((file) => (
                            <TouchableOpacity
                              key={file.id}
                              style={styles.commentFileItem}
                              onPress={() => handleFilePress(file)}
                            >
                              {isImageFile(file) ? (
                                <Image
                                  source={{ uri: file.url }}
                                  style={styles.commentFileThumbnail}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.commentFileIcon}>
                                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                    <Path
                                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                                      stroke={Colors.textSecondary}
                                      strokeWidth={2}
                                    />
                                  </Svg>
                                </View>
                              )}
                              <Text style={styles.commentFileName} numberOfLines={1}>
                                {file.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Comment Input */}
              {!isEditing && (
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={styles.commentInput}
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Add a comment..."
                    placeholderTextColor={Colors.textMuted}
                    multiline
                  />
                  
                  {/* Attachment Buttons */}
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.attachButton}
                      onPress={handleAttachPhoto}
                      disabled={uploadingFile}
                    >
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                          stroke={Colors.accent}
                          strokeWidth={2}
                        />
                        <Circle cx="12" cy="13" r="4" stroke={Colors.accent} strokeWidth={2} />
                      </Svg>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachButton}
                      onPress={handleAttachImage}
                      disabled={uploadingFile}
                    >
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                          stroke={Colors.accent}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </TouchableOpacity>
                    {commentFiles.length > 0 && (
                      <View style={styles.attachedFilesBadge}>
                        <Text style={styles.attachedFilesText}>{commentFiles.length}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.sendCommentButton,
                        (!commentText.trim() && commentFiles.length === 0) && styles.sendCommentButtonDisabled,
                      ]}
                      onPress={handleSendComment}
                      disabled={(!commentText.trim() && commentFiles.length === 0) || loading}
                    >
                      <SendIcon color={Colors.textInverse} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons for existing complaints */}
          {selectedTask && !isEditing && (
            <View style={styles.actionButtons}>
              {selectedTask.status !== 'COMPLETED' && (
                <>
                  {selectedTask.status !== 'IN_PROGRESS' && (
                    <TouchableOpacity style={styles.actionButton} onPress={handleStart}>
                      <View style={[styles.actionIcon, { backgroundColor: Colors.accent }]}>
                        <PlayIcon />
                      </View>
                      <Text style={styles.actionText}>Start Complaint</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionButton} onPress={handleComplete}>
                    <View style={[styles.actionIcon, { backgroundColor: Colors.success }]}>
                      <CheckIcon />
                    </View>
                    <Text style={styles.actionText}>Complete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Save Button */}
        {isEditing && (
          <View style={styles.footer}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setIsEditing(false);
                if (selectedTask) {
                  setTitle(selectedTask.title);
                  setDescription(selectedTask.description || '');
                  setPriority(selectedTask.priority);
                }
              }}
              style={styles.cancelButton}
            />
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={loading}
              style={styles.saveButton}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Stage Picker Modal */}
      <Modal
        visible={showStagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Status</Text>
              <TouchableOpacity
                onPress={() => setShowStagePicker(false)}
                style={styles.modalCloseButton}
              >
                <CloseIcon />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.stageList}>
              {stages.map((stage) => {
                const isSelected = stage.id === selectedTask?.stageId;
                return (
                  <TouchableOpacity
                    key={stage.id}
                    style={[
                      styles.stageOption,
                      isSelected && styles.stageOptionSelected,
                    ]}
                    onPress={() => handleStageChange(stage)}
                  >
                    <View style={[
                      styles.stageColorDot,
                      { backgroundColor: stage.color }
                    ]} />
                    <Text style={[
                      styles.stageOptionText,
                      isSelected && styles.stageOptionTextSelected,
                    ]}>
                      {stage.title}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <CheckIcon color={Colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          </View>
        </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.imageModalCloseButton}>
              <CloseIcon color={Colors.textInverse} />
            </View>
          </TouchableOpacity>
          {selectedImage && (
            <ScrollView
              contentContainerStyle={styles.imageModalContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              <Image
                source={{ uri: selectedImage.url }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <View style={styles.imageModalInfo}>
                <Text style={styles.imageModalName}>{selectedImage.name}</Text>
                <Text style={styles.imageModalSize}>{formatFileSize(selectedImage.size)}</Text>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accent,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  priorityOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  priorityHigh: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  priorityLow: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  priorityTextActive: {
    color: Colors.textInverse,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
  },
  statusCompleted: {
    backgroundColor: Colors.success + '20',
  },
  statusProgress: {
    backgroundColor: Colors.accent + '20',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  stageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stageBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  stageColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.textMuted,
  },
  stageText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCloseButton: {
    padding: 8,
  },
  stageList: {
    padding: 20,
  },
  stageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    marginBottom: 12,
    gap: 12,
  },
  stageOptionSelected: {
    backgroundColor: Colors.primary + '15',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  stageColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.textMuted,
  },
  stageOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  stageOptionTextSelected: {
    fontWeight: '700',
    color: Colors.primary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filesContainer: {
    gap: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  fileThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  fileIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fileSize: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  imageModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 150,
  },
  imageModalInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  imageModalName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textInverse,
    marginBottom: 4,
  },
  imageModalSize: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  commentsList: {
    gap: 16,
    marginBottom: 16,
  },
  commentItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  commentText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  commentFiles: {
    marginTop: 12,
    gap: 8,
  },
  commentFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  commentFileThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  commentFileIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentFileName: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  commentInputContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  commentInput: {
    minHeight: 60,
    maxHeight: 120,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  attachedFilesBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  attachedFilesText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textInverse,
  },
  sendCommentButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCommentButtonDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});
