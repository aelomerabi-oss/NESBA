import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, typography, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function EditProfileScreen() {
  const { session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!session?.user) return;
      const { data, error } = await supabase.from('profiles').select('full_name, bio').eq('id', session.user.id).single();
      if (!error && data) {
        setFullName(data.full_name || '');
        setBio(data.bio || '');
      }
      setLoading(false);
    };
    load();
  }, [session]);

  const handleSave = async () => {
    if (!session?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), bio: bio.trim(), updated_at: new Date().toISOString() })
      .eq('id', session.user.id);
    setSaving(false);

    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell people a bit about yourself..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
      />

      <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { ...typography.caption, marginTop: spacing.md, marginBottom: 4 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.sm, color: colors.text, fontSize: 15,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveBtn: {
    marginTop: spacing.xl, backgroundColor: colors.primary, padding: spacing.md,
    borderRadius: radius.md, alignItems: 'center', minHeight: 50, justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
