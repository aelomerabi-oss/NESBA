import { useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../../constants/theme';

import { useAuth } from '../../../context/AuthContext';

import {
  createCourse,
  createCourseLesson,
  createCourseSection,
  createLessonContent,
  getCategories,
  getMyCourses,
} from '../../../lib/nesba';

import {
  pickLessonFile,
  uploadLessonFile,
} from '../../../lib/lesson-file-upload';


export default function CreatorCourseBuilder() {
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // COURSE
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [courseCoverImageUrl, setCourseCoverImageUrl] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [categoryId, setCategoryId] = useState('');

  // DATA
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);

  // MODULES
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [editingModuleId, setEditingModuleId] = useState(null);

  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');

  // LESSON
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDuration, setLessonDuration] = useState('');
  const [lessonType, setLessonType] = useState('text');

  const [videoProvider, setVideoProvider] = useState('nesba');

  const [contentTitle, setContentTitle] = useState('');
  const [contentDescription, setContentDescription] =
    useState('');
  const [contentUrl, setContentUrl] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [pickingFile, setPickingFile] = useState(false);

  useEffect(() => {
    loadCreatorData();
  }, [session?.user?.id]);

  async function loadCreatorData() {
    try {
      setLoading(true);

      const userId = session?.user?.id;

      const [categoryData, courseData] =
        await Promise.all([
          getCategories(),
          userId ? getMyCourses(userId) : [],
        ]);

      setCategories(categoryData || []);
      setCourses(courseData || []);
    } catch (error) {
      console.error(
        'Creator Studio load error:',
        error
      );

      Alert.alert(
        'Could not load Creator Studio',
        error?.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedModule = useMemo(() => {
    return (
      modules.find(
        (module) =>
          module.id === selectedModuleId
      ) || null
    );
  }, [modules, selectedModuleId]);

  function resetLessonForm() {
    setLessonTitle('');
    setLessonDuration('');
    setLessonType('text');
    setVideoProvider('nesba');
    setContentTitle('');
    setContentDescription('');
    setContentUrl('');
    setSelectedFile(null);
  }

  function toggleModuleSelection(moduleId) {
    if (selectedModuleId === moduleId) {
      setSelectedModuleId(null);
      resetLessonForm();
      return;
    }

    setSelectedModuleId(moduleId);
    setEditingModuleId(null);

    setModuleTitle('');
    setModuleDescription('');

    resetLessonForm();
  }

  function addModule() {
    if (!moduleTitle.trim()) {
      Alert.alert(
        'Required',
        'Module title is required.'
      );
      return;
    }

    const newModule = {
      id:
        `local-module-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,

      title: moduleTitle.trim(),

      description:
        moduleDescription.trim(),

      lessons: [],
    };

    setModules((current) => [
      ...current,
      newModule,
    ]);

    setSelectedModuleId(newModule.id);

    setModuleTitle('');
    setModuleDescription('');
  }

  function editModule(module) {
    setSelectedModuleId(module.id);
    setEditingModuleId(module.id);

    setModuleTitle(module.title || '');
    setModuleDescription(
      module.description || ''
    );

    resetLessonForm();
  }

  function saveModuleEdit() {
    if (!editingModuleId) {
      return;
    }

    if (!moduleTitle.trim()) {
      Alert.alert(
        'Required',
        'Module title is required.'
      );
      return;
    }

    setModules((current) =>
      current.map((module) =>
        module.id === editingModuleId
          ? {
              ...module,
              title: moduleTitle.trim(),
              description:
                moduleDescription.trim(),
            }
          : module
      )
    );

    setEditingModuleId(null);
    setModuleTitle('');
    setModuleDescription('');
  }

  function cancelModuleEdit() {
    setEditingModuleId(null);
    setModuleTitle('');
    setModuleDescription('');
  }

  function removeModule(module) {
    if (!module?.id) {
      return;
    }

    setModules((current) =>
      current.filter(
        (item) =>
          item.id !== module.id
      )
    );

    if (
      selectedModuleId ===
      module.id
    ) {
      setSelectedModuleId(null);
    }

    if (
      editingModuleId ===
      module.id
    ) {
      setEditingModuleId(null);
    }

    setModuleTitle('');
    setModuleDescription('');

    resetLessonForm();
  }

  async function browseFile() {
    try {
      setPickingFile(true);

      const file =
        await pickLessonFile(
          lessonType
        );

      if (!file) {
        return;
      }

      setSelectedFile(file);
      setContentUrl(file.uri || '');
    } catch (error) {
      console.error(
        'File picker error:',
        error
      );

      Alert.alert(
        'File selection failed',
        error?.message ||
          'Could not select the file.'
      );
    } finally {
      setPickingFile(false);
    }
  }

  function changeLessonType(type) {
    setLessonType(type);
    setSelectedFile(null);
    setContentUrl('');
  }

  function addLesson() {
    if (!selectedModuleId) {
      Alert.alert(
        'Select a module',
        'Select a module before adding a lesson.'
      );
      return;
    }

    if (!lessonTitle.trim()) {
      Alert.alert(
        'Required',
        'Lesson title is required.'
      );
      return;
    }

    if (
      !lessonDuration ||
      Number(lessonDuration) <= 0
    ) {
      Alert.alert(
        'Required',
        'Lesson duration is required.'
      );
      return;
    }

    const fileTypes = [
      'video',
      'audio',
      'recording',
      'document',
    ];

    if (
      fileTypes.includes(
        lessonType
      ) &&
      !selectedFile
    ) {
      Alert.alert(
        'Required',
        'Please browse and select a file.'
      );
      return;
    }

    if (
      lessonType ===
        'external_link' &&
      !contentUrl.trim()
    ) {
      Alert.alert(
        'Required',
        'Please enter the external URL.'
      );
      return;
    }

    if (
      lessonType === 'text' &&
      !contentDescription.trim()
    ) {
      Alert.alert(
        'Required',
        'Please enter the lesson content.'
      );
      return;
    }

    const newLesson = {
      id:
        `local-lesson-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`,

      title:
        lessonTitle.trim(),

      durationMinutes:
        Number(lessonDuration),

      contentType:
        lessonType,

      provider:
        videoProvider,

      contentTitle:
        contentTitle.trim() ||
        lessonTitle.trim(),

      contentDescription:
        contentDescription.trim(),

      contentUrl:
        contentUrl.trim(),

      file: selectedFile,
    };

    setModules((current) =>
      current.map((module) =>
        module.id ===
        selectedModuleId
          ? {
              ...module,
              lessons: [
                ...module.lessons,
                newLesson,
              ],
            }
          : module
      )
    );

    resetLessonForm();
  }

  function removeLesson(
    moduleId,
    lessonId
  ) {
    setModules((current) =>
      current.map((module) =>
        module.id === moduleId
          ? {
              ...module,
              lessons:
                module.lessons.filter(
                  (lesson) =>
                    lesson.id !==
                    lessonId
                ),
            }
          : module
      )
    );
  }

  function validateCourse() {
    if (!courseTitle.trim()) {
      return 'Course title is required.';
    }

    if (!courseDescription.trim()) {
      return 'Course description is required.';
    }

    if (!categoryId) {
      return 'Course category is required.';
    }

    if (modules.length === 0) {
      return 'Add at least one module.';
    }

    return null;
  }

  async function saveCourse(
    publish = false
  ) {
    setSubmitted(true);

    const validation =
      validateCourse();

    if (validation) {
      Alert.alert(
        'Complete the course',
        validation
      );
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(
        'Login required',
        'Please log in before creating a course.'
      );
      return;
    }

    if (publish) {
      const emptyModule =
        modules.find(
          (module) =>
            module.lessons.length === 0
        );

      if (emptyModule) {
        Alert.alert(
          'Cannot publish',
          `"${emptyModule.title}" has no lessons.`
        );
        return;
      }
    }

    try {
      setSaving(true);

      const course =
        await createCourse({
          title:
            courseTitle.trim(),

          description:
            courseDescription.trim(),

          difficulty,

          thumbnailUrl:
            courseCoverImageUrl.trim() ||
            null,

          categoryId,

          isPublished: false,
        });

      for (
        let moduleIndex = 0;
        moduleIndex <
        modules.length;
        moduleIndex++
      ) {
        const module =
          modules[moduleIndex];

        const createdSection =
          await createCourseSection({
            courseId: course.id,

            title:
              module.title,

            description:
              module.description ||
              null,

            sortOrder:
              moduleIndex + 1,
          });

        for (
          let lessonIndex = 0;
          lessonIndex <
          module.lessons.length;
          lessonIndex++
        ) {
          const lesson =
            module.lessons[
              lessonIndex
            ];

          const createdLesson =
            await createCourseLesson({
              courseId:
                course.id,

              sectionId:
                createdSection.id,

              title:
                lesson.title,

              durationMinutes:
                lesson.durationMinutes,

              sortOrder:
                lessonIndex + 1,

              isLocked: false,

              videoUrl:
                lesson.contentType ===
                'external_link'
                  ? lesson.contentUrl
                  : null,
            });

          let storagePath = null;
          let uploadedUrl = null;

          if (
            lesson.file &&
            [
              'video',
              'audio',
              'recording',
              'document',
            ].includes(
              lesson.contentType
            )
          ) {
            const uploaded =
              await uploadLessonFile({
                userId:
                  session.user.id,

                courseId:
                  course.id,

                lessonId:
                  createdLesson.id,

                file:
                  lesson.file,
              });

            storagePath =
              uploaded.storagePath;

            uploadedUrl =
              uploaded.publicUrl ||
              null;
          }

          await createLessonContent({
            lessonId:
              createdLesson.id,

            title:
              lesson.contentTitle ||
              lesson.title,

            description:
              lesson.contentDescription ||
              null,

            contentType:
              lesson.contentType,

            provider:
              lesson.provider ||
              null,

            contentUrl:
              uploadedUrl ||
              (
                lesson.contentType ===
                'external_link'
                  ? lesson.contentUrl
                  : null
              ),

            storagePath,

            durationMinutes:
              lesson.durationMinutes,

            sortOrder: 1,

            isRequired: true,

            isPublished:
              publish,
          });
        }
      }

      if (publish) {
        const {
          supabase,
        } = await import(
          '../../../lib/supabase'
        );

        const {
          error,
        } = await supabase
          .from('courses')
          .update({
            is_published: true,
          })
          .eq(
            'id',
            course.id
          );

        if (error) {
          throw error;
        }
      }

      Alert.alert(
        publish
          ? 'Course Published'
          : 'Draft Saved',

        publish
          ? 'Your course has been published successfully.'
          : 'Your course has been saved as a draft.'
      );

      setCourseTitle('');
      setCourseDescription('');
      setCourseCoverImageUrl('');
      setDifficulty('beginner');
      setCategoryId('');

      setModules([]);
      setSelectedModuleId(null);
      setEditingModuleId(null);

      setModuleTitle('');
      setModuleDescription('');

      resetLessonForm();
      setSubmitted(false);

      await loadCreatorData();
    } catch (error) {
      console.error(
        'Creator course save error:',
        error
      );

      Alert.alert(
        'Could not save course',
        error?.message ||
          'Something went wrong while saving the course.'
      );
    } finally {
      setSaving(false);
    }
  }

  const totalLessons =
    modules.reduce(
      (total, module) =>
        total +
        module.lessons.length,
      0
    );

  const totalMinutes =
    modules.reduce(
      (total, module) =>
        total +
        module.lessons.reduce(
          (
            moduleTotal,
            lesson
          ) =>
            moduleTotal +
            Number(
              lesson.durationMinutes
            ),
          0
        ),
      0
    );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading Creator Studio...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text
          style={styles.pageTitle}
        >
          Create Course
        </Text>

        <Text
          style={
            styles.pageSubtitle
          }
        >
          Build your course with
          modules, lessons and
          learning content.
        </Text>
      </View>

      {/* COURSE */}

      <View style={styles.card}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          Course Details
        </Text>

        <FieldLabel
          label="Course Title"
          required
        />

        <TextInput
          value={courseTitle}
          onChangeText={
            setCourseTitle
          }
          style={[
            styles.input,
            submitted &&
              !courseTitle.trim() &&
              styles.inputError,
          ]}
          placeholder="Enter course title"
          placeholderTextColor={
            colors.textMuted
          }
        />

        <FieldLabel
          label="Course Description"
          required
        />

        <TextInput
          value={
            courseDescription
          }
          onChangeText={
            setCourseDescription
          }
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            styles.textArea,
            submitted &&
              !courseDescription.trim() &&
              styles.inputError,
          ]}
          placeholder="Describe what students will learn..."
          placeholderTextColor={
            colors.textMuted
          }
        />

        <FieldLabel
          label="Course Cover Image URL"
        />

        <TextInput
          value={
            courseCoverImageUrl
          }
          onChangeText={
            setCourseCoverImageUrl
          }
          style={styles.input}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://..."
          placeholderTextColor={
            colors.textMuted
          }
        />

        <FieldLabel
          label="Difficulty"
        />

        <View
          style={
            styles.choiceRow
          }
        >
          {[
            ['beginner', 'Beginner'],
            [
              'intermediate',
              'Intermediate',
            ],
            ['advanced', 'Advanced'],
          ].map(
            ([value, label]) => (
              <Pressable
                key={value}
                onPress={() =>
                  setDifficulty(
                    value
                  )
                }
                style={[
                  styles.choiceButton,
                  difficulty ===
                    value &&
                    styles.choiceButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    difficulty ===
                      value &&
                      styles.choiceTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            )
          )}
        </View>

        <FieldLabel
          label="Category"
          required
        />

        <View
          style={
            styles.categoryList
          }
        >
          {categories.map(
            (category) => {
              const active =
                categoryId ===
                category.id;

              return (
                <Pressable
                  key={
                    category.id
                  }
                  onPress={() =>
                    setCategoryId(
                      active
                        ? ''
                        : category.id
                    )
                  }
                  style={[
                    styles.categoryButton,
                    active &&
                      styles.categoryButtonActive,
                    submitted &&
                      !categoryId &&
                      styles.categoryButtonError,
                  ]}
                >
                  <View
                    style={
                      styles.categoryLeft
                    }
                  >
                    <View
                      style={[
                        styles.radio,
                        active &&
                          styles.radioActive,
                      ]}
                    >
                      {active ? (
                        <View
                          style={
                            styles.radioDot
                          }
                        />
                      ) : null}
                    </View>

                    <Text
                      style={[
                        styles.categoryText,
                        active &&
                          styles.categoryTextActive,
                      ]}
                    >
                      {category.name ||
                        category.title}
                    </Text>
                  </View>

                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={
                        colors.primary
                      }
                    />
                  ) : null}
                </Pressable>
              );
            }
          )}
        </View>

        {submitted &&
        !categoryId ? (
          <Text
            style={
              styles.errorText
            }
          >
            Category is required.
          </Text>
        ) : null}
      </View>

      {/* MODULES */}

      <View style={styles.card}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          Course Modules
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          Organize lessons into
          modules or sections.
          Select a module to add
          lessons to it.
        </Text>

        {modules.length === 0 ? (
          <View
            style={
              styles.emptyModules
            }
          >
            <Ionicons
              name="layers-outline"
              size={32}
              color={
                colors.textMuted
              }
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No modules yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Create your first
              module below.
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.moduleList
            }
          >
            {modules.map(
              (module, index) => {
                const selected =
                  selectedModuleId ===
                  module.id;

                const editing =
                  editingModuleId ===
                  module.id;

                return (
                  <View
                    key={
                      module.id
                    }
                    style={[
                      styles.moduleCard,
                      selected &&
                        styles.moduleCardSelected,
                    ]}
                  >
                    <View
                      style={
                        styles.moduleTop
                      }
                    >
                      <View
                        style={
                          styles.moduleNumber
                        }
                      >
                        <Text
                          style={
                            styles.moduleNumberText
                          }
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.moduleInfo
                        }
                      >
                        <Text
                          style={
                            styles.moduleName
                          }
                        >
                          {module.title}
                        </Text>

                        <Text
                          style={
                            styles.moduleLessonCount
                          }
                        >
                          {
                            module.lessons
                              .length
                          }{' '}
                          {module
                            .lessons
                            .length ===
                          1
                            ? 'lesson'
                            : 'lessons'}
                        </Text>

                        {module.description ? (
                          <Text
                            style={
                              styles.moduleDescription
                            }
                          >
                            {
                              module.description
                            }
                          </Text>
                        ) : null}
                      </View>

                      {selected ? (
                        <View
                          style={
                            styles.selectedBadge
                          }
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={15}
                            color="#fff"
                          />

                          <Text
                            style={
                              styles.selectedBadgeText
                            }
                          >
                            Selected
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View
                      style={
                        styles.moduleActions
                      }
                    >
                      <Pressable
                        onPress={() =>
                          toggleModuleSelection(
                            module.id
                          )
                        }
                        style={[
                          styles.actionButton,
                          selected &&
                            styles.actionButtonSelected,
                        ]}
                      >
                        <Ionicons
                          name={
                            selected
                              ? 'close-circle-outline'
                              : 'checkmark-circle-outline'
                          }
                          size={17}
                          color={
                            selected
                              ? '#fff'
                              : colors.primary
                          }
                        />

                        <Text
                          style={[
                            styles.actionButtonText,
                            selected &&
                              styles.actionButtonTextSelected,
                          ]}
                        >
                          {selected
                            ? 'Unselect'
                            : 'Select'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          editModule(
                            module
                          )
                        }
                        style={
                          styles.actionButton
                        }
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={
                            colors.primary
                          }
                        />

                        <Text
                          style={
                            styles.actionButtonText
                          }
                        >
                          Edit Module
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          removeModule(
                            module
                          )
                        }
                        style={
                          styles.removeActionButton
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color="#ff4d67"
                        />

                        <Text
                          style={
                            styles.removeActionText
                          }
                        >
                          Remove
                        </Text>
                      </Pressable>
                    </View>

                    {editing ? (
                      <View
                        style={
                          styles.editPanel
                        }
                      >
                        <Text
                          style={
                            styles.editPanelTitle
                          }
                        >
                          Edit Module
                        </Text>

                        <FieldLabel
                          label="Module Title"
                          required
                        />

                        <TextInput
                          value={
                            moduleTitle
                          }
                          onChangeText={
                            setModuleTitle
                          }
                          style={
                            styles.input
                          }
                        />

                        <FieldLabel
                          label="Module Description"
                        />

                        <TextInput
                          value={
                            moduleDescription
                          }
                          onChangeText={
                            setModuleDescription
                          }
                          multiline
                          textAlignVertical="top"
                          style={[
                            styles.input,
                            styles.smallTextArea,
                          ]}
                        />

                        <View
                          style={
                            styles.editButtons
                          }
                        >
                          <Pressable
                            onPress={
                              saveModuleEdit
                            }
                            style={
                              styles.saveEditButton
                            }
                          >
                            <Text
                              style={
                                styles.saveEditText
                              }
                            >
                              Save Changes
                            </Text>
                          </Pressable>

                          <Pressable
                            onPress={
                              cancelModuleEdit
                            }
                            style={
                              styles.cancelEditButton
                            }
                          >
                            <Text
                              style={
                                styles.cancelEditText
                              }
                            >
                              Cancel
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}

                    {selected &&
                    !editing ? (
                      <View
                        style={
                          styles.moduleSelectedMessage
                        }
                      >
                        <Ionicons
                          name="arrow-down-circle-outline"
                          size={18}
                          color={
                            colors.primary
                          }
                        />

                        <Text
                          style={
                            styles.moduleSelectedMessageText
                          }
                        >
                          Adding lessons
                          to this module
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              }
            )}
          </View>
        )}

        {!editingModuleId ? (
          <View
            style={
              styles.addModulePanel
            }
          >
            <Text
              style={
                styles.formTitle
              }
            >
              Add Module / Section
            </Text>

            <Text
              style={
                styles.formDescription
              }
            >
              Create a new module
              to organize your
              lessons.
            </Text>

            <FieldLabel
              label="Module Title"
              required
            />

            <TextInput
              value={
                moduleTitle
              }
              onChangeText={
                setModuleTitle
              }
              style={
                styles.input
              }
              placeholder="Example: Business Analytics Fundamentals"
              placeholderTextColor={
                colors.textMuted
              }
            />

            <FieldLabel
              label="Module Description"
            />

            <TextInput
              value={
                moduleDescription
              }
              onChangeText={
                setModuleDescription
              }
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.smallTextArea,
              ]}
              placeholder="Describe this module..."
              placeholderTextColor={
                colors.textMuted
              }
            />

            <Pressable
              onPress={addModule}
              style={
                styles.primaryButton
              }
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color="#fff"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Add Module
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* LESSON BUILDER */}

      <View style={styles.card}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          Build Course Lessons
        </Text>

        {!selectedModule ? (
          <View
            style={
              styles.noSelectionBox
            }
          >
            <Ionicons
              name="layers-outline"
              size={30}
              color={
                colors.textMuted
              }
            />

            <Text
              style={
                styles.noSelectionTitle
              }
            >
              Select a module
            </Text>

            <Text
              style={
                styles.noSelectionText
              }
            >
              Choose a module above
              before adding a lesson.
            </Text>
          </View>
        ) : (
          <>
            <View
              style={
                styles.currentModuleBanner
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={21}
                color={
                  colors.primary
                }
              />

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={
                    styles.currentModuleLabel
                  }
                >
                  Adding lessons to
                </Text>

                <Text
                  style={
                    styles.currentModuleName
                  }
                >
                  {selectedModule.title}
                </Text>
              </View>
            </View>

            <FieldLabel
              label="Lesson Title"
              required
            />

            <TextInput
              value={lessonTitle}
              onChangeText={
                setLessonTitle
              }
              style={
                styles.input
              }
              placeholder="Enter lesson title"
              placeholderTextColor={
                colors.textMuted
              }
            />

            <FieldLabel
              label="Duration (minutes)"
              required
            />

            <TextInput
              value={
                lessonDuration
              }
              onChangeText={
                setLessonDuration
              }
              keyboardType="numeric"
              style={
                styles.input
              }
              placeholder="30"
              placeholderTextColor={
                colors.textMuted
              }
            />

            <FieldLabel
              label="Lesson Content Type"
              required
            />

            <View
              style={
                styles.lessonTypeList
              }
            >
              {[
                [
                  'text',
                  'Text',
                  'Written learning material',
                  'document-text-outline',
                ],
                [
                  'video',
                  'Video',
                  'Upload a video lesson',
                  'videocam-outline',
                ],
                [
                  'recording',
                  'Recording',
                  'Upload a Zoom, Teams or Meet recording',
                  'radio-outline',
                ],
                [
                  'document',
                  'Document',
                  'Upload a PDF or learning document',
                  'document-outline',
                ],
                [
                  'audio',
                  'Audio',
                  'Upload an audio lesson',
                  'musical-notes-outline',
                ],
                [
                  'quiz',
                  'Quiz',
                  'Knowledge check',
                  'help-circle-outline',
                ],
                [
                  'assignment',
                  'Assignment',
                  'Student assignment',
                  'clipboard-outline',
                ],
                [
                  'external_link',
                  'External Link',
                  'External learning resource',
                  'link-outline',
                ],
              ].map(
                ([
                  type,
                  label,
                  help,
                  icon,
                ]) => {
                  const active =
                    lessonType ===
                    type;

                  return (
                    <Pressable
                      key={type}
                      onPress={() =>
                        changeLessonType(
                          type
                        )
                      }
                      style={[
                        styles.lessonTypeCard,
                        active &&
                          styles.lessonTypeCardActive,
                      ]}
                    >
                      <Ionicons
                        name={icon}
                        size={24}
                        color={
                          active
                            ? colors.primary
                            : colors.textMuted
                        }
                      />

                      <View
                        style={
                          styles.lessonTypeInfo
                        }
                      >
                        <Text
                          style={
                            styles.lessonTypeTitle
                          }
                        >
                          {label}
                        </Text>

                        <Text
                          style={
                            styles.lessonTypeHelp
                          }
                        >
                          {help}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.lessonRadio,
                          active &&
                            styles.lessonRadioActive,
                        ]}
                      >
                        {active ? (
                          <View
                            style={
                              styles.lessonRadioDot
                            }
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                }
              )}
            </View>

            {[
              'video',
              'audio',
              'recording',
              'document',
            ].includes(
              lessonType
            ) ? (
              <View
                style={
                  styles.fileUploadPanel
                }
              >
                <FieldLabel
                  label="Upload File"
                  required
                />

                <Pressable
                  onPress={
                    browseFile
                  }
                  disabled={
                    pickingFile
                  }
                  style={
                    styles.browseButton
                  }
                >
                  {pickingFile ? (
                    <ActivityIndicator
                      color={
                        colors.primary
                      }
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={30}
                        color={
                          colors.primary
                        }
                      />

                      <Text
                        style={
                          styles.browseButtonTitle
                        }
                      >
                        Browse / Upload
                      </Text>

                      <Text
                        style={
                          styles.browseButtonHelp
                        }
                      >
                        Select your{' '}
                        {lessonType}{' '}
                        file
                      </Text>
                    </>
                  )}
                </Pressable>

                {selectedFile ? (
                  <View
                    style={
                      styles.fileSelected
                    }
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={
                        colors.success
                      }
                    />

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.fileName
                        }
                      >
                        {selectedFile.name}
                      </Text>

                      <Text
                        style={
                          styles.fileStatus
                        }
                      >
                        Ready to upload
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {lessonType ===
            'external_link' ? (
              <>
                <FieldLabel
                  label="Content URL"
                  required
                />

                <TextInput
                  value={
                    contentUrl
                  }
                  onChangeText={
                    setContentUrl
                  }
                  style={
                    styles.input
                  }
                  autoCapitalize="none"
                  keyboardType="url"
                  placeholder="https://..."
                  placeholderTextColor={
                    colors.textMuted
                  }
                />
              </>
            ) : null}

            {[
              'video',
              'recording',
            ].includes(
              lessonType
            ) ? (
              <>
                <FieldLabel
                  label="Video Provider"
                />

                <View
                  style={
                    styles.choiceRow
                  }
                >
                  {[
                    ['nesba', 'NESBA'],
                    ['youtube', 'YouTube'],
                    ['vimeo', 'Vimeo'],
                  ].map(
                    ([value, label]) => (
                      <Pressable
                        key={value}
                        onPress={() =>
                          setVideoProvider(
                            value
                          )
                        }
                        style={[
                          styles.choiceButton,
                          videoProvider ===
                            value &&
                            styles.choiceButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            videoProvider ===
                              value &&
                              styles.choiceTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              </>
            ) : null}

            <FieldLabel
              label="Content Title"
            />

            <TextInput
              value={
                contentTitle
              }
              onChangeText={
                setContentTitle
              }
              style={
                styles.input
              }
              placeholder="Content title"
              placeholderTextColor={
                colors.textMuted
              }
            />

            <FieldLabel
              label={
                lessonType ===
                'text'
                  ? 'Lesson Content'
                  : 'Content Description'
              }
              required={
                lessonType ===
                'text'
              }
            />

            <TextInput
              value={
                contentDescription
              }
              onChangeText={
                setContentDescription
              }
              multiline
              textAlignVertical="top"
              style={[
                styles.input,
                styles.contentTextArea,
              ]}
              placeholder={
                lessonType ===
                'text'
                  ? 'Write the lesson content here...'
                  : 'Describe this content...'
              }
              placeholderTextColor={
                colors.textMuted
              }
            />

            <Pressable
              onPress={
                addLesson
              }
              style={
                styles.primaryButton
              }
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color="#fff"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Add Lesson to Selected Module
              </Text>
            </Pressable>

            <View
              style={
                styles.lessonList
              }
            >
              <Text
                style={
                  styles.lessonListTitle
                }
              >
                Lessons in this module
              </Text>

              {selectedModule
                .lessons.length ===
              0 ? (
                <Text
                  style={
                    styles.emptyLessonText
                  }
                >
                  No lessons yet.
                </Text>
              ) : (
                selectedModule.lessons.map(
                  (
                    lesson,
                    index
                  ) => (
                    <View
                      key={
                        lesson.id
                      }
                      style={
                        styles.lessonItem
                      }
                    >
                      <View
                        style={
                          styles.lessonIndex
                        }
                      >
                        <Text
                          style={
                            styles.lessonIndexText
                          }
                        >
                          {index + 1}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.lessonInfo
                        }
                      >
                        <Text
                          style={
                            styles.lessonName
                          }
                        >
                          {lesson.title}
                        </Text>

                        <Text
                          style={
                            styles.lessonMeta
                          }
                        >
                          {
                            lesson.durationMinutes
                          }{' '}
                          min •{' '}
                          {
                            lesson.contentType
                          }
                        </Text>
                      </View>

                      <Pressable
                        onPress={() =>
                          removeLesson(
                            selectedModule.id,
                            lesson.id
                          )
                        }
                        style={
                          styles.lessonRemove
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color="#ff4d67"
                        />
                      </Pressable>
                    </View>
                  )
                )
              )}
            </View>
          </>
        )}
      </View>

      {/* STATS */}

      <View
        style={
          styles.statsRow
        }
      >
        <Stat
          number={
            modules.length
          }
          label="Modules"
        />

        <Stat
          number={
            totalLessons
          }
          label="Lessons"
        />

        <Stat
          number={
            totalMinutes
          }
          label="Minutes"
        />
      </View>

      {/* ACTIONS */}

      <View style={styles.card}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          Course Actions
        </Text>

        <Pressable
          onPress={() =>
            saveCourse(false)
          }
          disabled={saving}
          style={
            styles.secondaryButton
          }
        >
          {saving ? (
            <ActivityIndicator
              color={
                colors.primary
              }
            />
          ) : (
            <>
              <Ionicons
                name="save-outline"
                size={20}
                color={
                  colors.primary
                }
              />

              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Save Course as Draft
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() =>
            saveCourse(true)
          }
          disabled={saving}
          style={
            styles.primaryButton
          }
        >
          {saving ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <>
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color="#fff"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Publish Course
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* COURSES */}

      <View style={styles.card}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          Your Courses
        </Text>

        {courses.length === 0 ? (
          <View
            style={
              styles.emptyCourses
            }
          >
            <Ionicons
              name="school-outline"
              size={30}
              color={
                colors.textMuted
              }
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No courses yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Your saved courses
              will appear here.
            </Text>
          </View>
        ) : (
          courses.map(
            (course) => (
              <View
                key={
                  course.id
                }
                style={
                  styles.courseItem
                }
              >
                <Ionicons
                  name="school-outline"
                  size={22}
                  color={
                    colors.primary
                  }
                />

                <View
                  style={
                    styles.courseItemInfo
                  }
                >
                  <Text
                    style={
                      styles.courseItemTitle
                    }
                  >
                    {course.title}
                  </Text>

                  <Text
                    style={
                      styles.courseItemStatus
                    }
                  >
                    {course.is_published
                      ? 'Published'
                      : 'Draft'}
                  </Text>
                </View>
              </View>
            )
          )
        )}
      </View>
    </ScrollView>
  );
}


function FieldLabel({
  label,
  required = false,
}) {
  return (
    <Text
      style={
        styles.fieldLabel
      }
    >
      {label}{' '}
      {required ? (
        <Text
          style={
            styles.required
          }
        >
          *
        </Text>
      ) : null}
    </Text>
  );
}


function Stat({
  number,
  label,
}) {
  return (
    <View
      style={
        styles.stat
      }
    >
      <Text
        style={
          styles.statNumber
        }
      >
        {number}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}


const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      padding:
        spacing.md,
      paddingBottom:
        spacing.xl * 3,
    },

    center: {
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    loadingText: {
      marginTop:
        spacing.md,
      color:
        colors.textMuted,
    },

    header: {
      marginBottom:
        spacing.lg,
    },

    pageTitle: {
      ...typography.h1,
      color:
        colors.text,
      fontSize: 30,
    },

    pageSubtitle: {
      color:
        colors.textMuted,
      marginTop:
        spacing.xs,
      lineHeight: 22,
    },

    card: {
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      padding:
        spacing.md,
      marginBottom:
        spacing.md,
    },

    sectionTitle: {
      ...typography.h2,
      color:
        colors.text,
      fontSize: 21,
      marginBottom:
        spacing.xs,
    },

    sectionDescription: {
      color:
        colors.textMuted,
      lineHeight: 21,
      marginBottom:
        spacing.md,
    },

    fieldLabel: {
      color:
        colors.text,
      fontWeight:
        '800',
      marginTop:
        spacing.md,
      marginBottom:
        spacing.xs,
    },

    required: {
      color:
        '#ff4d67',
      fontWeight:
        '900',
    },

    errorText: {
      color:
        '#ff4d67',
      marginTop:
        spacing.xs,
      fontWeight:
        '700',
    },

    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.background,
      color:
        colors.text,
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        spacing.sm,
    },

    inputError: {
      borderColor:
        '#ff4d67',
      borderWidth: 2,
    },

    textArea: {
      minHeight: 125,
    },

    smallTextArea: {
      minHeight: 90,
    },

    contentTextArea: {
      minHeight: 160,
    },

    choiceRow: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap:
        spacing.sm,
    },

    choiceButton: {
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        spacing.sm,
      backgroundColor:
        colors.background,
    },

    choiceButtonActive: {
      backgroundColor:
        colors.primary,
      borderColor:
        colors.primary,
    },

    choiceText: {
      color:
        colors.text,
      fontWeight:
        '700',
    },

    choiceTextActive: {
      color:
        '#fff',
    },

    categoryList: {
      gap:
        spacing.sm,
    },

    categoryButton: {
      minHeight: 54,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.background,
      paddingHorizontal:
        spacing.md,
    },

    categoryButtonActive: {
      borderColor:
        colors.primary,
    },

    categoryButtonError: {
      borderColor:
        '#ff4d67',
    },

    categoryLeft: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
    },

    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor:
        colors.border,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    radioActive: {
      borderColor:
        colors.primary,
    },

    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        colors.primary,
    },

    categoryText: {
      color:
        colors.text,
      fontWeight:
        '700',
    },

    categoryTextActive: {
      color:
        colors.primary,
    },

    emptyModules: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical:
        spacing.xl,
      borderWidth: 1,
      borderStyle:
        'dashed',
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
    },

    emptyTitle: {
      color:
        colors.text,
      fontWeight:
        '800',
      fontSize: 16,
      marginTop:
        spacing.sm,
    },

    emptyText: {
      color:
        colors.textMuted,
      marginTop: 4,
      textAlign:
        'center',
    },

    moduleList: {
      gap:
        spacing.sm,
    },

    moduleCard: {
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.background,
      padding:
        spacing.md,
    },

    moduleCardSelected: {
      borderColor:
        colors.primary,
      borderWidth: 2,
    },

    moduleTop: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },

    moduleNumber: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        colors.primary,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight:
        spacing.sm,
    },

    moduleNumberText: {
      color:
        '#fff',
      fontWeight:
        '900',
    },

    moduleInfo: {
      flex: 1,
    },

    moduleName: {
      color:
        colors.text,
      fontSize: 17,
      fontWeight:
        '900',
    },

    moduleLessonCount: {
      color:
        colors.textMuted,
      marginTop: 3,
      fontSize: 13,
    },

    moduleDescription: {
      color:
        colors.textMuted,
      marginTop:
        spacing.xs,
      lineHeight: 19,
    },

    selectedBadge: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
      backgroundColor:
        colors.primary,
      paddingHorizontal:
        spacing.sm,
      paddingVertical: 6,
      borderRadius: 20,
    },

    selectedBadgeText: {
      color:
        '#fff',
      fontWeight:
        '800',
      fontSize: 12,
    },

    moduleActions: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      gap:
        spacing.sm,
      marginTop:
        spacing.md,
    },

    actionButton: {
      minHeight: 40,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 6,
      borderWidth: 1,
      borderColor:
        colors.primary,
      borderRadius:
        radius.sm,
      paddingHorizontal:
        spacing.sm,
    },

    actionButtonSelected: {
      backgroundColor:
        colors.primary,
    },

    actionButtonText: {
      color:
        colors.primary,
      fontWeight:
        '800',
      fontSize: 12,
    },

    actionButtonTextSelected: {
      color:
        '#fff',
    },

    removeActionButton: {
      minHeight: 40,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 6,
      borderWidth: 1,
      borderColor:
        '#ff4d67',
      borderRadius:
        radius.sm,
      paddingHorizontal:
        spacing.sm,
    },

    removeActionText: {
      color:
        '#ff4d67',
      fontWeight:
        '800',
      fontSize: 12,
    },

    moduleSelectedMessage: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 7,
      marginTop:
        spacing.md,
      padding:
        spacing.sm,
      borderRadius:
        radius.sm,
      backgroundColor:
        colors.background,
    },

    moduleSelectedMessageText: {
      color:
        colors.primary,
      fontWeight:
        '700',
      fontSize: 13,
    },

    editPanel: {
      marginTop:
        spacing.md,
      paddingTop:
        spacing.md,
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    editPanelTitle: {
      color:
        colors.text,
      fontSize: 17,
      fontWeight:
        '900',
    },

    editButtons: {
      flexDirection:
        'row',
      gap:
        spacing.sm,
      marginTop:
        spacing.md,
    },

    saveEditButton: {
      flex: 1,
      minHeight: 46,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.primary,
      borderRadius:
        radius.md,
    },

    saveEditText: {
      color:
        '#fff',
      fontWeight:
        '900',
    },

    cancelEditButton: {
      minHeight: 46,
      paddingHorizontal:
        spacing.md,
      alignItems:
        'center',
      justifyContent:
        'center',
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
    },

    cancelEditText: {
      color:
        colors.text,
      fontWeight:
        '800',
    },

    addModulePanel: {
      marginTop:
        spacing.lg,
      paddingTop:
        spacing.lg,
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    formTitle: {
      color:
        colors.text,
      fontSize: 18,
      fontWeight:
        '900',
    },

    formDescription: {
      color:
        colors.textMuted,
      marginTop: 4,
    },

    primaryButton: {
      minHeight: 50,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 8,
      backgroundColor:
        colors.primary,
      borderRadius:
        radius.md,
      paddingHorizontal:
        spacing.md,
      marginTop:
        spacing.md,
    },

    primaryButtonText: {
      color:
        '#fff',
      fontWeight:
        '900',
    },

    noSelectionBox: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical:
        spacing.xl,
      borderWidth: 1,
      borderStyle:
        'dashed',
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
    },

    noSelectionTitle: {
      color:
        colors.text,
      fontSize: 17,
      fontWeight:
        '900',
      marginTop:
        spacing.sm,
    },

    noSelectionText: {
      color:
        colors.textMuted,
      marginTop: 4,
      textAlign:
        'center',
    },

    currentModuleBanner: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderWidth: 1,
      borderColor:
        colors.primary,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.background,
    },

    currentModuleLabel: {
      color:
        colors.textMuted,
      fontSize: 12,
    },

    currentModuleName: {
      color:
        colors.text,
      fontSize: 16,
      fontWeight:
        '900',
      marginTop: 2,
    },

    lessonTypeList: {
      gap:
        spacing.sm,
    },

    lessonTypeCard: {
      minHeight: 70,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      padding:
        spacing.md,
      backgroundColor:
        colors.background,
    },

    lessonTypeCardActive: {
      borderColor:
        colors.primary,
      borderWidth: 2,
    },

    lessonTypeInfo: {
      flex: 1,
    },

    lessonTypeTitle: {
      color:
        colors.text,
      fontWeight:
        '900',
    },

    lessonTypeHelp: {
      color:
        colors.textMuted,
      fontSize: 12,
      marginTop: 3,
    },

    lessonRadio: {
      width: 21,
      height: 21,
      borderRadius: 11,
      borderWidth: 2,
      borderColor:
        colors.border,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    lessonRadioActive: {
      borderColor:
        colors.primary,
    },

    lessonRadioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor:
        colors.primary,
    },

    fileUploadPanel: {
      marginTop:
        spacing.sm,
    },

    browseButton: {
      minHeight: 130,
      borderWidth: 1.5,
      borderStyle:
        'dashed',
      borderColor:
        colors.primary,
      borderRadius:
        radius.md,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.background,
    },

    browseButtonTitle: {
      color:
        colors.primary,
      fontWeight:
        '900',
      marginTop:
        spacing.xs,
    },

    browseButtonHelp: {
      color:
        colors.textMuted,
      fontSize: 12,
      marginTop: 3,
    },

    fileSelected: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
      padding:
        spacing.sm,
      marginTop:
        spacing.sm,
      borderWidth: 1,
      borderColor:
        colors.success,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.background,
    },

    fileName: {
      color:
        colors.text,
      fontWeight:
        '800',
    },

    fileStatus: {
      color:
        colors.success,
      fontSize: 12,
      marginTop: 2,
    },

    lessonList: {
      marginTop:
        spacing.xl,
    },

    lessonListTitle: {
      color:
        colors.text,
      fontSize: 16,
      fontWeight:
        '900',
      marginBottom:
        spacing.sm,
    },

    emptyLessonText: {
      color:
        colors.textMuted,
      paddingVertical:
        spacing.md,
    },

    lessonItem: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
      padding:
        spacing.sm,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.background,
      marginBottom:
        spacing.sm,
    },

    lessonIndex: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        colors.surface,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    lessonIndexText: {
      color:
        colors.text,
      fontWeight:
        '900',
    },

    lessonInfo: {
      flex: 1,
    },

    lessonName: {
      color:
        colors.text,
      fontWeight:
        '800',
    },

    lessonMeta: {
      color:
        colors.textMuted,
      fontSize: 12,
      marginTop: 3,
    },

    lessonRemove: {
      width: 38,
      height: 38,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    statsRow: {
      flexDirection:
        'row',
      gap:
        spacing.sm,
      marginBottom:
        spacing.md,
    },

    stat: {
      flex: 1,
      alignItems:
        'center',
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      paddingVertical:
        spacing.md,
    },

    statNumber: {
      color:
        colors.text,
      fontSize: 24,
      fontWeight:
        '900',
    },

    statLabel: {
      color:
        colors.textMuted,
      fontSize: 12,
      marginTop: 3,
    },

    secondaryButton: {
      minHeight: 50,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      gap: 8,
      borderWidth: 1,
      borderColor:
        colors.primary,
      borderRadius:
        radius.md,
      paddingHorizontal:
        spacing.md,
      marginTop:
        spacing.sm,
    },

    secondaryButtonText: {
      color:
        colors.primary,
      fontWeight:
        '900',
    },

    emptyCourses: {
      alignItems:
        'center',
      paddingVertical:
        spacing.lg,
    },

    courseItem: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.background,
      marginBottom:
        spacing.sm,
    },

    courseItemInfo: {
      flex: 1,
    },

    courseItemTitle: {
      color:
        colors.text,
      fontWeight:
        '900',
      fontSize: 15,
    },

    courseItemStatus: {
      color:
        colors.textMuted,
      fontSize: 12,
      marginTop: 3,
    },
  });