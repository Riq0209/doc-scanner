import { DatabaseService } from '@/lib/database';
import { testSupabaseConnection } from '@/lib/test-connection';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DatabaseTestScreen() {
  const [testResult, setTestResult] = useState<string>('');

  const runConnectionTest = async () => {
    const result = await testSupabaseConnection();
    if (result.success) {
      setTestResult('✅ Database Connected Successfully!');
    } else {
      setTestResult(`❌ Connection Failed: ${result.error}`);
    }
  };

  const testPDFSave = async () => {
    try {
      const result = await DatabaseService.savePDFToHistory({
        title: 'Test PDF Document',
        pdf_url: 'test://pdf-url',
        page_count: 3,
        thumbnail_url: 'test://thumbnail-url'
      });

      if (result.success) {
        Alert.alert('Success', 'Test PDF saved to database!');
      } else {
        Alert.alert('Error', `Failed to save: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Exception: ${error}`);
    }
  };

  const testGetHistory = async () => {
    try {
      const result = await DatabaseService.getAllHistory(10);
      if (result.success) {
        Alert.alert('Success', `Found ${result.data?.length || 0} history items`);
      } else {
        Alert.alert('Error', `Failed to get history: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Exception: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Database Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={runConnectionTest}>
        <Text style={styles.buttonText}>Test Connection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testPDFSave}>
        <Text style={styles.buttonText}>Test Save PDF</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testGetHistory}>
        <Text style={styles.buttonText}>Test Get History</Text>
      </TouchableOpacity>

      {testResult ? (
        <Text style={styles.result}>{testResult}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  result: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
});
