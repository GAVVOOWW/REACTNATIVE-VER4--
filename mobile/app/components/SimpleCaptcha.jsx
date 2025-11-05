import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal, // Import Modal
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from "@env";

const API_URL = `${API_BASE_URL}/api`; 

const SimpleCaptcha = ({ onVerify, onError, style }) => {
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false); // State for modal

  // Fetch a new captcha challenge from the backend
  const fetchCaptcha = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/captcha`);
      if (response.data.success) {
        setCaptchaQuestion(response.data.question);
      } else {
        setError('Failed to load captcha. Please try again.');
      }
    } catch (err) {
      console.error('Fetch Captcha Error:', err);
      setError('Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const openCaptchaModal = () => {
    setIsModalVisible(true);
    fetchCaptcha(); // Fetch a new captcha when modal opens
    setUserInput(''); // Clear previous input
  };

  const handleVerify = async () => {
    if (!userInput) {
      onError && onError('Please enter the answer.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/captcha/verify`, {
        userAnswer: userInput,
      });

      if (response.data.success) {
        setIsVerified(true);
        onVerify && onVerify(response.data.token); 
        setIsModalVisible(false); // Close modal on success
      } else {
        onError && onError('Incorrect captcha. A new one has been generated.');
        setUserInput('');
        fetchCaptcha();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Verification failed. Please try again.';
      console.error('Verify Captcha Error:', err.response?.data || err.message);
      onError && onError(errorMessage);
      setUserInput('');
      fetchCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCaptcha = () => {
    setUserInput('');
    fetchCaptcha();
  };

  return (
    <View style={style}>
      {!isVerified ? (
        <TouchableOpacity style={styles.openButton} onPress={openCaptchaModal}>
          <Text style={styles.openButtonText}>Verify you're a human</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>Captcha verified</Text>
        </View>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          setIsModalVisible(!isModalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.label}>Verify you're human:</Text>
            
            <View style={styles.captchaContainer}>
              <View style={styles.captchaDisplay}>
                {isLoading ? (
                  <ActivityIndicator color="#1f2937" />
                ) : (
                  <Text style={styles.captchaText}>{captchaQuestion}</Text>
                )}
              </View>
              
              <TouchableOpacity style={styles.refreshButton} onPress={refreshCaptcha} disabled={isLoading}>
                <Text style={styles.refreshButtonText}>🔄</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter the answer"
              value={userInput}
              onChangeText={setUserInput}
              keyboardType="number-pad"
              maxLength={3}
              editable={!isVerified && !isLoading}
            />

            <TouchableOpacity 
              style={[styles.verifyButton, isLoading && styles.disabledButton]} 
              onPress={handleVerify}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  openButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
    textAlign: 'center',
  },
  captchaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 50,
  },
  captchaDisplay: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginRight: 10,
    minWidth: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captchaText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    letterSpacing: 3,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    width: 220,
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: '#fff'
  },
  verifyButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 10,
  },
  closeButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  successContainer: {
    padding: 15,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6ee7b7',
    alignItems: 'center',
    marginVertical: 10,
  },
  successText: {
    color: '#065f46',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default SimpleCaptcha; 