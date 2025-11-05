"use client"

import React, { useState, useEffect, useRef } from "react"
import { API_BASE_URL } from "@env";
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    SafeAreaView, FlatList, ActivityIndicator, Alert, Modal, TextInput, Image
} from "react-native"
import Icon from "react-native-vector-icons/MaterialIcons"
import { useRouter } from "expo-router"
import AsyncStorage from '@react-native-async-storage/async-storage'
import CustomOrdersTab from './CustomOrdersTab'
import { OrderDetailModal } from './components/OrderDetailModal'
import { socket } from '../utils/socket'
import * as ImagePicker from 'expo-image-picker'
import LogsTab from './LogsTab.jsx';
import AnalyticsTab from './AnalyticsTab.jsx';

// Alternative import method for better compatibility
const { MediaType } = ImagePicker;




const StatCard = ({ icon, label, value, color }) => (

    <View style={styles.statCard}>

        <Icon name={icon} size={28} color={color} />

        <Text style={styles.statValue}>{value}</Text>

        <Text style={styles.statLabel}>{label}</Text>

    </View>

);







const ProductModal = ({

    isVisible,

    onClose,

    isCreating,

    formData,

    setFormData,

    categories,

    furnitureTypes,

    handleInputChange,

    handleCategoryChange,

    pickImages,

    handleSubmit,

    addMaterial,

    removeMaterial,

}) => (

    <Modal

        visible={isVisible}

        animationType="slide"

        transparent={true}

        onRequestClose={onClose}

    >

        <View style={styles.modalOverlay}>

            <View style={styles.modalContent}>

                <View style={styles.modalHeader}>

                    <Text style={styles.modalTitle}>

                        {isCreating ? 'Create New Product' : 'Edit Product'}

                    </Text>

                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>

                        <Icon name="close" size={24} color="#6c757d" />

                    </TouchableOpacity>

                </View>



                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

                    <View style={styles.modalSection}>

                        <Text style={styles.modalSectionTitle}>Basic Information</Text>



                        <Text style={styles.inputLabel}>Product Name *</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.name}

                            onChangeText={(text) => handleInputChange('name', text)}

                            placeholder="Enter product name"

                        />



                        <Text style={styles.inputLabel}>Description</Text>

                        <TextInput

                            style={[styles.textInput, styles.textArea]}

                            value={formData.description}

                            onChangeText={(text) => handleInputChange('description', text)}

                            placeholder="Enter product description"

                            multiline

                            numberOfLines={3}

                        />



                        <View style={styles.row}>

                            <View style={styles.halfWidth}>

                                <Text style={styles.inputLabel}>Price (₱) *</Text>

                                <TextInput

                                    style={styles.textInput}

                                    value={formData.price}

                                    onChangeText={(text) => handleInputChange('price', text)}

                                    placeholder="0.00"

                                    keyboardType="numeric"

                                />

                            </View>

                            <View style={styles.halfWidth}>

                                <Text style={styles.inputLabel}>Cost (₱) *</Text>

                                <TextInput

                                    style={styles.textInput}

                                    value={formData.cost}

                                    onChangeText={(text) => handleInputChange('cost', text)}

                                    placeholder="0.00"

                                    keyboardType="numeric"

                                />

                            </View>

                        </View>



                        <Text style={styles.inputLabel}>Stock Quantity *</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.stock}

                            onChangeText={(text) => handleInputChange('stock', text)}

                            placeholder="0"

                            keyboardType="numeric"

                        />

                    </View>



                    <View style={styles.modalSection}>

                        <Text style={styles.modalSectionTitle}>Dimensions (feet)</Text>



                        <View style={styles.row}>

                            <View style={styles.thirdWidth}>

                                <Text style={styles.inputLabel}>Length *</Text>

                                <TextInput

                                    style={styles.textInput}

                                    value={formData.length}

                                    onChangeText={(text) => handleInputChange('length', text)}

                                    placeholder="0.0"

                                    keyboardType="numeric"

                                />

                            </View>

                            <View style={styles.thirdWidth}>

                                <Text style={styles.inputLabel}>Height *</Text>

                                <TextInput

                                    style={styles.textInput}

                                    value={formData.height}

                                    onChangeText={(text) => handleInputChange('height', text)}

                                    placeholder="0.0"

                                    keyboardType="numeric"

                                />

                            </View>

                            <View style={styles.thirdWidth}>

                                <Text style={styles.inputLabel}>Width *</Text>

                                <TextInput

                                    style={styles.textInput}

                                    value={formData.width}

                                    onChangeText={(text) => handleInputChange('width', text)}

                                    placeholder="0.0"

                                    keyboardType="numeric"

                                />

                            </View>

                        </View>

                    </View>



                    <View style={styles.modalSection}>

                        <Text style={styles.modalSectionTitle}>Categories</Text>



                        <Text style={styles.inputLabel}>Categories *</Text>

                        <View style={styles.pickerContainer}>

                            <Text style={styles.pickerText}>

                                {formData.category.length > 0 ?

                                    `${formData.category.length} categories selected` :

                                    'Select Categories'

                                }

                            </Text>

                            <Icon name="arrow-drop-down" size={24} color="#6c757d" />

                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChips}>

                            {categories.map(category => (

                                <TouchableOpacity

                                    key={category._id}

                                    style={[

                                        styles.categoryChip,

                                        formData.category.includes(category._id) && styles.categoryChipActive

                                    ]}

                                    onPress={() => handleCategoryChange(category._id)}

                                >

                                    <Text style={[

                                        styles.categoryChipText,

                                        formData.category.includes(category._id) && styles.categoryChipTextActive

                                    ]}>

                                        {category.name}

                                    </Text>

                                </TouchableOpacity>

                            ))}

                        </ScrollView>



                        <Text style={styles.inputLabel}>Furniture Type *</Text>

                        <View style={styles.pickerContainer}>

                            <Text style={styles.pickerText}>

                                {formData.furnituretype ?

                                    furnitureTypes.find(type => type._id === formData.furnituretype)?.name || 'Select Type' :

                                    'Select Type'

                                }

                            </Text>

                            <Icon name="arrow-drop-down" size={24} color="#6c757d" />

                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChips}>

                            {furnitureTypes.map(type => (

                                <TouchableOpacity

                                    key={type._id}

                                    style={[

                                        styles.categoryChip,

                                        formData.furnituretype === type._id && styles.categoryChipActive

                                    ]}

                                    onPress={() => handleInputChange('furnituretype', type._id)}

                                >

                                    <Text style={[

                                        styles.categoryChipText,

                                        formData.furnituretype === type._id && styles.categoryChipTextActive

                                    ]}>

                                        {type.name}

                                    </Text>

                                </TouchableOpacity>

                            ))}

                        </ScrollView>

                    </View>



                    <View style={styles.modalSection}>

                        <Text style={styles.modalSectionTitle}>Images</Text>



                        <Text style={styles.inputLabel}>Product Images</Text>

                        <TouchableOpacity

                            style={styles.imageUploadButton}

                            onPress={pickImages}

                        >

                            <Icon name="add-a-photo" size={24} color="#007bff" />

                            <Text style={styles.imageUploadText}>

                                {formData.images && formData.images.length > 0 ?

                                    `${formData.images.length} image(s) selected` :

                                    'Select Images (Multiple)'}

                            </Text>

                        </TouchableOpacity>

                        <Text style={styles.helperText}>

                            Select new images to replace existing ones. Leave empty to keep current images. (Max 5 images)

                        </Text>



                        {formData.images && formData.images.length > 0 && (

                            <View style={styles.imagePreviewContainer}>

                                <Text style={styles.inputLabel}>Selected Images:</Text>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>

                                    {formData.images.map((image, index) => (

                                        <View key={index} style={styles.imagePreviewItem}>

                                            <Image

                                                source={{ uri: image.uri }}

                                                style={styles.imagePreview}

                                            />

                                            <TouchableOpacity

                                                style={styles.removeImageButton}

                                                onPress={() => {

                                                    setFormData(prev => ({

                                                        ...prev,

                                                        images: prev.images.filter((_, i) => i !== index)

                                                    }));

                                                }}

                                            >

                                                <Icon name="close" size={16} color="#ffffff" />

                                            </TouchableOpacity>

                                        </View>

                                    ))}

                                </ScrollView>

                            </View>

                        )}

                    </View>



                    <View style={styles.modalSection}>

                        <Text style={styles.modalSectionTitle}>Options</Text>



                        <View style={styles.checkboxRow}>

                            <TouchableOpacity

                                style={styles.checkbox}

                                onPress={() => handleInputChange('is_bestseller', !formData.is_bestseller)}

                            >

                                <Icon

                                    name={formData.is_bestseller ? "check-box" : "check-box-outline-blank"}

                                    size={20}

                                    color={formData.is_bestseller ? "#007bff" : "#6c757d"}

                                />

                            </TouchableOpacity>

                            <Text style={styles.checkboxLabel}>Best Seller</Text>

                        </View>



                        <View style={styles.checkboxRow}>

                            <TouchableOpacity

                                style={styles.checkbox}

                                onPress={() => handleInputChange('isPackage', !formData.isPackage)}

                            >

                                <Icon

                                    name={formData.isPackage ? "check-box" : "check-box-outline-blank"}

                                    size={20}

                                    color={formData.isPackage ? "#007bff" : "#6c757d"}

                                />

                            </TouchableOpacity>

                            <Text style={styles.checkboxLabel}>Package Item</Text>

                        </View>



                        <View style={styles.checkboxRow}>

                            <TouchableOpacity

                                style={styles.checkbox}

                                onPress={() => handleInputChange('is_customizable', !formData.is_customizable)}

                                disabled={!furnitureTypes.find(ft => ft._id === formData.furnituretype)?.name?.toLowerCase().includes('table')}

                            >

                                <Icon

                                    name={formData.is_customizable ? "check-box" : "check-box-outline-blank"}

                                    size={20}

                                    color={formData.is_customizable ? "#007bff" : "#6c757d"}

                                    style={!furnitureTypes.find(ft => ft._id === formData.furnituretype)?.name?.toLowerCase().includes('table') ? { opacity: 0.5 } : {}}

                                />

                            </TouchableOpacity>

                            <Text style={[styles.checkboxLabel, !furnitureTypes.find(ft => ft._id === formData.furnituretype)?.name?.toLowerCase().includes('table') ? { opacity: 0.5 } : {}]}>

                                Enable Customization (Tables Only)

                            </Text>

                        </View>

                    </View>



                    {formData.is_customizable && (

                        <View style={styles.modalSection}>

                            <Text style={styles.modalSectionTitle}>Customization Options</Text>



                            <View style={styles.row}>

                                <View style={styles.halfWidth}>

                                    <Text style={styles.inputLabel}>Labor Cost / Day (₱)</Text>

                                    <TextInput

                                        style={styles.textInput}

                                        value={formData.labor_cost_per_day?.toString()}

                                        onChangeText={(text) => handleInputChange('labor_cost_per_day', text)}

                                        placeholder="350"

                                        keyboardType="numeric"

                                    />

                                </View>

                                <View style={styles.halfWidth}>

                                    <Text style={styles.inputLabel}>Profit Margin</Text>

                                    <TextInput

                                        style={styles.textInput}

                                        value={formData.profit_margin?.toString()}

                                        onChangeText={(text) => handleInputChange('profit_margin', text)}

                                        placeholder="0.5"

                                        keyboardType="numeric"

                                    />

                                </View>

                            </View>



                            <View style={styles.row}>

                                <View style={styles.halfWidth}>

                                    <Text style={styles.inputLabel}>Overhead Cost (₱)</Text>

                                    <TextInput

                                        style={styles.textInput}

                                        value={formData.overhead_cost?.toString()}

                                        onChangeText={(text) => handleInputChange('overhead_cost', text)}

                                        placeholder="500"

                                        keyboardType="numeric"

                                    />

                                </View>

                                <View style={styles.halfWidth}>

                                    <Text style={styles.inputLabel}>Estimated Days</Text>

                                    <TextInput

                                        style={styles.textInput}

                                        value={formData.estimated_days?.toString()}

                                        onChangeText={(text) => handleInputChange('estimated_days', text)}

                                        placeholder="7"

                                        keyboardType="numeric"

                                    />

                                </View>

                            </View>



                            <Text style={styles.inputLabel}>Materials</Text>

                            {formData.materials.map((mat, index) => (

                                <View key={index} style={styles.materialRow}>

                                    <View style={styles.materialInputContainer}>

                                        <Text style={styles.materialLabel}>Name</Text>

                                        <TextInput

                                            style={styles.materialInput}

                                            placeholder="Material name"

                                            value={mat.name}

                                            onChangeText={(text) => handleInputChange(`material_${index}_name`, text)}

                                        />

                                    </View>



                                    <View style={styles.materialInputContainer}>

                                        <Text style={styles.materialLabel}>2×12×10 Cost (₱)</Text>

                                        <TextInput

                                            style={styles.materialInput}

                                            placeholder="0"

                                            value={mat.plank_2x12x10_cost?.toString()}

                                            onChangeText={(text) => handleInputChange(`material_${index}_plank_2x12x10_cost`, text)}

                                            keyboardType="numeric"

                                        />

                                    </View>



                                    <View style={styles.materialInputContainer}>

                                        <Text style={styles.materialLabel}>3×3×10 Cost (₱)</Text>

                                        <TextInput

                                            style={styles.materialInput}

                                            placeholder="0"

                                            value={mat.plank_3x3x10_cost?.toString()}

                                            onChangeText={(text) => handleInputChange(`material_${index}_plank_3x3x10_cost`, text)}

                                            keyboardType="numeric"

                                        />

                                    </View>



                                    <TouchableOpacity

                                        style={styles.removeMaterialButton}

                                        onPress={() => removeMaterial(index)}

                                    >

                                        <Icon name="delete" size={20} color="#dc3545" />

                                    </TouchableOpacity>

                                </View>

                            ))}



                            <TouchableOpacity

                                style={styles.addMaterialButton}

                                onPress={addMaterial}

                            >

                                <Icon name="add" size={20} color="#007bff" />

                                <Text style={styles.addMaterialText}>Add Material</Text>

                            </TouchableOpacity>

                        </View>

                    )}

                </ScrollView>



                <View style={styles.modalFooter}>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>

                        <Text style={styles.cancelButtonText}>Cancel</Text>

                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>

                        <Text style={styles.saveButtonText}>

                            {isCreating ? 'Create Product' : 'Update Product'}

                        </Text>

                    </TouchableOpacity>

                </View>

            </View>

        </View>

    </Modal>

);



const CustomerModal = ({

    isVisible,

    onClose,

    isCreating,

    formData,

    setFormData,

    provinces,

    cities,

    barangays,

    handleInputChange,

    handleAddressChange,

    handleSubmit,

}) => (

    <Modal

        visible={isVisible}

        animationType="slide"

        transparent={true}

        onRequestClose={onClose}

    >

        <View style={styles.modalOverlay}>

            <View style={styles.modalContent}>

                <View style={styles.modalHeader}>

                    <Text style={styles.modalTitle}>

                        {isCreating ? 'Create New Customer' : 'Edit Customer'}

                    </Text>

                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>

                        <Icon name="close" size={24} color="#6c757d" />

                    </TouchableOpacity>

                </View>



                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

                    <View style={styles.modalSection}>

                        <Text style={styles.modalSectionTitle}>Basic Information</Text>



                        <Text style={styles.inputLabel}>Full Name *</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.name}

                            onChangeText={(text) => handleInputChange('name', text)}

                            placeholder="Enter full name"

                        />



                        <Text style={styles.inputLabel}>Email Address *</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.email}

                            onChangeText={(text) => handleInputChange('email', text)}

                            placeholder="Enter email address"

                            keyboardType="email-address"

                            autoCapitalize="none"

                        />



                        <Text style={styles.inputLabel}>Phone Number *</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.phone}

                            onChangeText={(text) => handleInputChange('phone', text)}

                            placeholder="Enter phone number"

                            keyboardType="phone-pad"

                        />

                    </View>

                    <View style={styles.modalSection}>

                        <Text style={styles.modalSectionTitle}>Address Information</Text>



                        <Text style={styles.inputLabel}>Full Name (for address) *</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.address.fullName}

                            onChangeText={(text) => handleAddressChange('fullName', text)}

                            placeholder="Enter full name for shipping"

                        />



                        <Text style={styles.inputLabel}>Address Line 1 *</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.address.addressLine1}

                            onChangeText={(text) => handleAddressChange('addressLine1', text)}

                            placeholder="Street address, house number"

                        />



                        <Text style={styles.inputLabel}>Address Line 2</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.address.addressLine2}

                            onChangeText={(text) => handleAddressChange('addressLine2', text)}

                            placeholder="Apartment, suite, unit (optional)"

                        />



                        <Text style={styles.inputLabel}>Province *</Text>

                        <TouchableOpacity

                            style={styles.dropdownContainer}

                            onPress={() => {

                                Alert.alert(

                                    'Select Province',

                                    '',

                                    provinces.map(province => ({

                                        text: province.name,

                                        onPress: () => handleAddressChange('provinceCode', province.code)

                                    })).concat([{ text: 'Cancel', style: 'cancel' }])

                                );

                            }}

                        >

                            <Text style={styles.dropdownText}>

                                {formData.address.provinceName || 'Select Province'}

                            </Text>

                            <Icon name="arrow-drop-down" size={24} color="#6c757d" />

                        </TouchableOpacity>



                        <Text style={styles.inputLabel}>City/Municipality *</Text>

                        <TouchableOpacity

                            style={[styles.dropdownContainer, !formData.address.provinceCode && styles.dropdownDisabled]}

                            disabled={!formData.address.provinceCode}

                            onPress={() => {

                                if (cities.length > 0) {

                                    Alert.alert(

                                        'Select City/Municipality',

                                        '',

                                        cities.map(city => ({

                                            text: city.name,

                                            onPress: () => handleAddressChange('cityCode', city.code)

                                        })).concat([{ text: 'Cancel', style: 'cancel' }])

                                    );

                                } else {

                                    Alert.alert('Info', 'Please select a province first');

                                }

                            }}

                        >

                            <Text style={[styles.dropdownText, !formData.address.provinceCode && styles.dropdownTextDisabled]}>

                                {formData.address.cityName || 'Select City/Municipality'}

                            </Text>

                            <Icon name="arrow-drop-down" size={24} color="#6c757d" />

                        </TouchableOpacity>



                        <Text style={styles.inputLabel}>Barangay *</Text>

                        <TouchableOpacity

                            style={[styles.dropdownContainer, !formData.address.cityCode && styles.dropdownDisabled]}

                            disabled={!formData.address.cityCode}

                            onPress={() => {

                                if (barangays.length > 0) {

                                    Alert.alert(

                                        'Select Barangay',

                                        '',

                                        barangays.map(barangay => ({

                                            text: barangay.name,

                                            onPress: () => handleAddressChange('brgyCode', barangay.code)

                                        })).concat([{ text: 'Cancel', style: 'cancel' }])

                                    );

                                } else {

                                    Alert.alert('Info', 'Please select a city first');

                                }

                            }}

                        >

                            <Text style={[styles.dropdownText, !formData.address.cityCode && styles.dropdownTextDisabled]}>

                                {formData.address.brgyName || 'Select Barangay'}

                            </Text>

                            <Icon name="arrow-drop-down" size={24} color="#6c757d" />

                        </TouchableOpacity>



                        <Text style={styles.inputLabel}>Postal Code</Text>

                        <TextInput

                            style={styles.textInput}

                            value={formData.address.postalCode}

                            onChangeText={(text) => handleAddressChange('postalCode', text)}

                            placeholder="Postal/ZIP code"

                            keyboardType="numeric"

                        />

                    </View>



                    <View style={styles.modalSection}>

                        <Text style={styles.modalSectionTitle}>Role</Text>



                        <Text style={styles.inputLabel}>User Role</Text>

                        <View style={styles.roleSelectionContainer}>

                            <TouchableOpacity

                                style={[

                                    styles.roleOption,

                                    formData.role === 'user' && styles.roleOptionActive

                                ]}

                                onPress={() => handleInputChange('role', 'user')}

                            >

                                <Icon

                                    name={formData.role === 'user' ? "radio-button-checked" : "radio-button-unchecked"}

                                    size={20}

                                    color={formData.role === 'user' ? "#007bff" : "#6c757d"}

                                />

                                <Text style={[

                                    styles.roleOptionText,

                                    formData.role === 'user' && styles.roleOptionTextActive

                                ]}>

                                    User

                                </Text>

                            </TouchableOpacity>



                            <TouchableOpacity

                                style={[

                                    styles.roleOption,

                                    formData.role === 'admin' && styles.roleOptionActive

                                ]}

                                onPress={() => handleInputChange('role', 'admin')}

                            >

                                <Icon

                                    name={formData.role === 'admin' ? "radio-button-checked" : "radio-button-unchecked"}

                                    size={20}

                                    color={formData.role === 'admin' ? "#007bff" : "#6c757d"}

                                />

                                <Text style={[

                                    styles.roleOptionText,

                                    formData.role === 'admin' && styles.roleOptionTextActive

                                ]}>

                                    Admin

                                </Text>

                            </TouchableOpacity>

                        </View>



                        {isCreating && (

                            <View style={styles.infoBox}>

                                <Icon name="info" size={16} color="#007bff" />

                                <Text style={styles.infoText}>

                                    A default password will be set for new users. They can change it after logging in.

                                </Text>

                            </View>

                        )}

                    </View>

                </ScrollView>



                <View style={styles.modalFooter}>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>

                        <Text style={styles.cancelButtonText}>Cancel</Text>

                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>

                        <Text style={styles.saveButtonText}>

                            {isCreating ? 'Create Customer' : 'Update Customer'}

                        </Text>

                    </TouchableOpacity>

                </View>

            </View>

        </View>

    </Modal>

);



const CategoryModal = ({

    isVisible,

    onClose,

    isCreating,

    formData,

    setFormData,

    onSubmit,

}) => (

    <Modal

        visible={isVisible}

        animationType="slide"

        transparent={true}

        onRequestClose={onClose}

    >

        <View style={styles.modalOverlay}>

            <View style={styles.settingsModalContent}>

                <View style={styles.modalHeader}>

                    <Text style={styles.modalTitle}>

                        {isCreating ? 'Create New Category' : 'Edit Category'}

                    </Text>

                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>

                        <Icon name="close" size={24} color="#6c757d" />

                    </TouchableOpacity>

                </View>



                <View style={styles.modalBody}>

                    <Text style={styles.inputLabel}>Category Name *</Text>

                    <TextInput

                        style={styles.textInput}

                        value={formData.name}

                        onChangeText={(text) => setFormData({ name: text })}

                        placeholder="Enter category name"

                        autoFocus

                    />

                </View>



                <View style={styles.modalFooter}>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>

                        <Text style={styles.cancelButtonText}>Cancel</Text>

                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveButton} onPress={onSubmit}>

                        <Text style={styles.saveButtonText}>

                            {isCreating ? 'Create Category' : 'Update Category'}

                        </Text>

                    </TouchableOpacity>

                </View>

            </View>

        </View>

    </Modal>

);



const FurnitureModal = ({

    isVisible,

    onClose,

    isCreating,

    formData,

    setFormData,

    onSubmit

}) => (

    <Modal

        visible={isVisible}

        animationType="slide"

        transparent={true}

        onRequestClose={onClose}

    >

        <View style={styles.modalOverlay}>

            <View style={styles.settingsModalContent}>

                <View style={styles.modalHeader}>

                    <Text style={styles.modalTitle}>

                        {isCreating ? 'Create New Furniture Type' : 'Edit Furniture Type'}

                    </Text>

                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>

                        <Icon name="close" size={24} color="#6c757d" />

                    </TouchableOpacity>

                </View>



                <View style={styles.modalBody}>

                    <Text style={styles.inputLabel}>Furniture Type Name *</Text>

                    <TextInput

                        style={styles.textInput}

                        value={formData.name}

                        onChangeText={(text) => setFormData({ name: text })}

                        placeholder="Enter furniture type name"

                        autoFocus

                    />

                </View>



                <View style={styles.modalFooter}>

                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>

                        <Text style={styles.cancelButtonText}>Cancel</Text>

                    </TouchableOpacity>

                    <TouchableOpacity style={styles.saveButton} onPress={onSubmit}>

                        <Text style={styles.saveButtonText}>

                            {isCreating ? 'Create Furniture Type' : 'Update Furniture Type'}

                        </Text>

                    </TouchableOpacity>

                </View>

            </View>

        </View>

    </Modal>

);



const DashboardTab = ({ stats, recentOrders }) => {

    const renderOrderItem = ({ item, index }) => (

        <View style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : null]}>

            <Text style={[styles.tableCell, { flex: 1.5 }]}>#{item._id.slice(-6)}</Text>


            <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>₱{Number(item.totalAmount || item.amount || 0).toLocaleString()}</Text>

            <View style={[styles.tableCell, { flex: 1.5, alignItems: 'flex-end' }]}>

                <Text style={[styles.statusBadge, styles[`status_${item.status}`]]}>{item.status}</Text>

            </View>

        </View>

    );



    const renderDashboardContent = () => {

        const content = [

            { type: 'header', key: 'header' },

            { type: 'stats', key: 'stats' },

            { type: 'ordersHeader', key: 'ordersHeader' },

            { type: 'tableHeader', key: 'tableHeader' },

        ];



        if (recentOrders.length > 0) {

            content.push(...recentOrders.map((order, index) => ({

                type: 'order',

                key: order._id,

                item: order,

                index

            })));

        } else {

            content.push({ type: 'emptyOrders', key: 'emptyOrders' });

        }



        return content;

    };



    const renderDashboardItem = ({ item }) => {

        switch (item.type) {

            case 'header':

                return <Text style={styles.pageTitle}>Dashboard</Text>;

            case 'stats':

                return (

                    <View style={styles.statsGrid}>

                        <StatCard icon="attach-money" label="Total Sales" value={`₱${Number(stats.totalSales || 0).toLocaleString()}`} color="#10B981" />

                        <StatCard icon="shopping-cart" label="Total Orders" value={stats.totalOrders} color="#3B82F6" />

                        <StatCard icon="people" label="Customers" value={stats.totalCustomers} color="#8B5CF6" />

                        <StatCard icon="inventory" label="Products" value={stats.totalProducts} color="#F59E0B" />

                        <StatCard icon="build" label="Processing Orders" value={stats.processingOrders || 0} color="#2196F3" />

                        <StatCard icon="warning" label="Low Stock Items" value={stats.lowStockProducts || 0} color="#F44336" />

                    </View>

                );

            case 'ordersHeader':

                return (

                    <View style={styles.card}>

                        <Text style={styles.cardTitle}>Recent Orders</Text>

                    </View>

                );

            case 'tableHeader':

                return (

                    <View style={[styles.tableHeader, { backgroundColor: '#f8f9fa', marginHorizontal: 15 }]}>

                        <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Order ID</Text>



                        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>

                        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Status</Text>

                    </View>

                );

            case 'order':

                return (

                    <View style={{ marginHorizontal: 15 }}>

                        {renderOrderItem({ item: item.item, index: item.index })}

                    </View>

                );

            case 'emptyOrders':

                return (

                    <View style={[styles.emptyState, { marginHorizontal: 15 }]}>

                        <Icon name="receipt-long" size={48} color="#6c757d" />

                        <Text style={styles.emptyStateText}>No recent orders</Text>

                        <Text style={styles.emptyStateSubtext}>Orders will appear here</Text>

                    </View>

                );

            default:

                return null;

        }

    };



    return (

        <FlatList

            data={renderDashboardContent()}

            renderItem={renderDashboardItem}

            keyExtractor={(item) => item.key}

            contentContainerStyle={{ padding: 15 }}

            showsVerticalScrollIndicator={false}

        />

    );

};



const OrdersTab = ({ orders, onUpdateOrderStatus, API_BASE_URL }) => {

    const ORDER_STATUSES = ['On Process', 'Delivered', 'Requesting for Refund', 'Refunded'];

    const [searchQuery, setSearchQuery] = useState('');

    const [statusFilter, setStatusFilter] = useState('all');

    const [selectedOrder, setSelectedOrder] = useState(null);

    const [showOrderModal, setShowOrderModal] = useState(false);

    const [showDeliveryProofModal, setShowDeliveryProofModal] = useState(false);

    const [selectedOrderForProof, setSelectedOrderForProof] = useState(null);



    const filteredOrders = orders.filter(order => {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch = searchQuery === '' ||
            order._id.toLowerCase().includes(lowerQuery) ||
            (order.user?.name || '').toLowerCase().includes(lowerQuery) ||
            (order.user?.email || '').toLowerCase().includes(lowerQuery);

        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });



    const openOrderDetail = (order) => {

        setSelectedOrder(order);

        setShowOrderModal(true);

    };



    const closeOrderDetail = () => {

        setSelectedOrder(null);

        setShowOrderModal(false);

    };



    const updateOrderStatusFromModal = (orderId, newStatus, remarks = '') => {

        onUpdateOrderStatus(orderId, newStatus, remarks);

        setSelectedOrder(prev => prev ? { ...prev, status: newStatus, remarks } : null);

    };



    const openDeliveryProofModal = (order) => {

        setSelectedOrderForProof(order);

        setShowDeliveryProofModal(true);

    };



    const closeDeliveryProofModal = () => {

        setSelectedOrderForProof(null);

        setShowDeliveryProofModal(false);

    };



    const renderOrderItem = ({ item, index }) => (

        <TouchableOpacity

            style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : null]}

            onPress={() => openOrderDetail(item)}

        >

            <Text style={[styles.tableCell, { flex: 1.2 }]}>#{item._id.slice(-6)}</Text>

            <Text style={[styles.tableCell, { flex: 1.8 }]} numberOfLines={1}>{item.user?.name || 'N/A'}</Text>

            <Text style={[styles.tableCell, { flex: 1.2, textAlign: 'right' }]}>₱{Number(item.totalAmount || item.amount || 0).toLocaleString()}</Text>

            <View style={[styles.tableCell, { flex: 1.8, alignItems: 'flex-end' }]}>

                <View style={styles.orderActionContainer}>

                    <View style={styles.statusContainer}>

                        <Text style={[styles.statusBadge, styles[`status_${item.status}`]]}>{item.status}</Text>

                    </View>

                    {item.status === 'Delivered' && (

                        <TouchableOpacity

                            style={styles.deliveryProofButton}

                            onPress={(e) => {

                                e.stopPropagation();

                                openDeliveryProofModal(item);

                            }}

                        >

                            <Icon

                                name={item.deliveryProof ? 'remove-red-eye' : 'camera-alt'}

                                size={16}

                                color={item.deliveryProof ? '#17a2b8' : '#28a745'}

                            />

                        </TouchableOpacity>

                    )}

                </View>

            </View>

        </TouchableOpacity>

    );



    const renderStatusFilter = (status) => (

        <TouchableOpacity

            key={status}

            style={[

                styles.filterChip,

                statusFilter === status && styles.filterChipActive

            ]}

            onPress={() => setStatusFilter(status)}

        >

            <Text style={[

                styles.filterChipText,

                statusFilter === status && styles.filterChipTextActive

            ]}>

                {status === 'all' ? 'All' : status}

            </Text>

        </TouchableOpacity>

    );



    const renderOrdersContent = () => {

        const content = [

            { type: 'header', key: 'header' },

            { type: 'searchBar', key: 'searchBar' },

            { type: 'statusFilter', key: 'statusFilter' },

            { type: 'resultsSummary', key: 'resultsSummary' },

            { type: 'tableTitle', key: 'tableTitle' },

            { type: 'tableHeader', key: 'tableHeader' },

        ];



        if (filteredOrders.length > 0) {

            content.push(...filteredOrders.map(order => ({

                type: 'order',

                key: order._id,

                item: order

            })));

        } else {

            content.push({ type: 'emptyState', key: 'emptyState' });

        }



        return content;

    };



    const renderOrdersItem = ({ item }) => {

        switch (item.type) {

            case 'header':

                return <Text style={styles.pageTitle}>Orders Management</Text>;

            case 'searchBar':

                return (

                    <View style={styles.searchContainer}>

                        <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />

                        <TextInput

                            style={styles.searchInput}

                            placeholder="Search by ID, Name, or Email..."

                            value={searchQuery}

                            onChangeText={setSearchQuery}

                            placeholderTextColor="#6c757d"

                        />

                        {searchQuery.length > 0 && (

                            <TouchableOpacity onPress={() => setSearchQuery('')}>

                                <Icon name="close" size={20} color="#6c757d" />

                            </TouchableOpacity>

                        )}

                    </View>

                );

            case 'statusFilter':

                return (

                    <View style={styles.filtersContainer}>

                        <Text style={styles.filtersLabel}>Filter by Status:</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>

                            {renderStatusFilter('all')}

                            {ORDER_STATUSES.map(status => renderStatusFilter(status))}

                        </ScrollView>

                    </View>

                );

            case 'resultsSummary':

                return (

                    <View style={styles.resultsSummary}>

                        <Text style={styles.resultsText}>

                            Showing {filteredOrders.length} of {orders.length} orders

                        </Text>

                    </View>

                );

            case 'tableTitle':

                return (

                    <View style={styles.card}>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>

                            <View>

                                <Text style={styles.cardTitle}>All Orders ({filteredOrders.length})</Text>

                                <Text style={styles.cardSubtitle}>Tap row to view details • Tap status to update</Text>

                            </View>

                        </View>

                    </View>

                );

            case 'tableHeader':

                return (

                    <View style={[styles.tableHeader, { backgroundColor: '#f8f9fa', marginHorizontal: 15 }]}>

                        <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Order ID</Text>



                        <Text style={[styles.tableHeaderCell, { flex: 1.8 }]}>Customer</Text>

                        <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>

                        <Text style={[styles.tableHeaderCell, { flex: 1.8, textAlign: 'right' }]}>Status</Text>

                    </View>

                );

            case 'order':

                const index = filteredOrders.findIndex(o => o._id === item.item._id);

                return (

                    <View style={{ marginHorizontal: 15 }}>

                        {renderOrderItem({ item: item.item, index })}

                    </View>

                );

            case 'emptyState':

                return (

                    <View style={[styles.emptyState, { marginHorizontal: 15 }]}>

                        <Icon name="search-off" size={48} color="#6c757d" />

                        <Text style={styles.emptyStateText}>No orders found</Text>

                        <Text style={styles.emptyStateSubtext}>

                            Try adjusting your search or filters

                        </Text>

                    </View>

                );

            default:

                return null;

        }

    };



    return (

        <View style={{ flex: 1 }}>

            <FlatList

                data={renderOrdersContent()}

                renderItem={renderOrdersItem}

                keyExtractor={(item) => item.key}

                contentContainerStyle={{ padding: 15 }}

                showsVerticalScrollIndicator={false}

            />

            <OrderDetailModal

                isVisible={showOrderModal}

                onClose={closeOrderDetail}

                selectedOrder={selectedOrder}

                onUpdateOrderStatus={updateOrderStatusFromModal}

            />

            <DeliveryProofModal

                isVisible={showDeliveryProofModal}

                onClose={closeDeliveryProofModal}

                order={selectedOrderForProof}

                onUpdateOrderStatus={onUpdateOrderStatus}

                API_BASE_URL={API_BASE_URL}

            />

        </View>

    );

};



const DeliveryProofModal = ({

    isVisible,

    onClose,

    order,

    onUpdateOrderStatus,

    API_BASE_URL,

}) => {

    const [deliveryProofImage, setDeliveryProofImage] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const hasExistingProof = !!(order && order.deliveryProof);



    useEffect(() => {

        if (isVisible) {

            setDeliveryProofImage(null);

            setIsSubmitting(false);

        }

    }, [isVisible, order?._id]);



    if (!isVisible || !order) return null;



    if (hasExistingProof) {

        return (

            <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>

                <View style={styles.modalOverlay}>

                    <View style={[styles.modalContent, { padding: 20 }]}> 

                        <Image source={{ uri: order.deliveryProof }} style={styles.deliveryProofPreview} />

                        <TouchableOpacity style={[styles.cancelButton, { alignSelf: 'center', marginTop: 20 }]} onPress={onClose}>

                            <Text style={styles.cancelButtonText}>Close</Text>

                        </TouchableOpacity>

                    </View>

                </View>

            </Modal>

        );

    }



    const pickImage = async (source) => {

        try {

            const permissionFn = source === 'camera'

                ? ImagePicker.requestCameraPermissionsAsync

                : ImagePicker.requestMediaLibraryPermissionsAsync;

            const launchFn = source === 'camera'

                ? ImagePicker.launchCameraAsync

                : ImagePicker.launchImageLibraryAsync;



            const permission = await permissionFn();

            if (!permission.granted) {

                Alert.alert('Permission Required', `Permission to access the ${source} is required!`);

                return;

            }



            const result = await launchFn({

                mediaTypes: ImagePicker.MediaTypeOptions.Images,

                allowsEditing: true,

                aspect: [4, 3],

                quality: 0.8,

            });



            if (!result.canceled && result.assets?.length) {

                setDeliveryProofImage(result.assets[0]);

            }

        } catch (err) {

            console.error(`Error picking image from ${source}:`, err);

            Alert.alert('Error', `Failed to get image from ${source}.`);

        }

    };



    const chooseImageSource = () => {

        Alert.alert(

            'Select Image',

            'Choose a source for the delivery proof image',

            [

                { text: 'Camera', onPress: () => pickImage('camera') },

                { text: 'Gallery', onPress: () => pickImage('gallery') },

                { text: 'Cancel', style: 'cancel' },

            ],

        );

    };



    const submitDeliveryProof = async () => {

        if (!deliveryProofImage) {

            Alert.alert('Error', 'Please select a delivery proof image.');

            return;

        }



        try {

            setIsSubmitting(true);

            const token = await AsyncStorage.getItem('token');

            if (!token) throw new Error('Auth token missing');



            const formData = new FormData();

            formData.append('deliveryProof', {

                uri: deliveryProofImage.uri,

                type: deliveryProofImage.type || 'image/jpeg',

                name: deliveryProofImage.fileName || `delivery_proof_${order._id}.jpg`,

            });



            const res = await fetch(`${API_BASE_URL}/api/orders/${order._id}/delivery-proof`, {

                method: 'POST',

                headers: { Authorization: `Bearer ${token}` },

                body: formData,

            });

            const data = await res.json();



            if (res.ok && data.success) {



                onUpdateOrderStatus(order._id, 'Delivered');

                onClose();

            } else {

                Alert.alert('Error', data.message || 'Failed to submit delivery proof');

            }

        } catch (err) {

            console.error('Error submitting delivery proof:', err);

            Alert.alert('Network Error', 'Unable to submit delivery proof.');

        } finally {

            setIsSubmitting(false);

        }

    };



    return (

        <Modal

            visible={isVisible}

            animationType="slide"

            transparent

            onRequestClose={onClose}

        >

            <View style={styles.modalOverlay}>

                <View style={[styles.modalContent, { maxHeight: '90%' }]}>

                    <View style={styles.modalHeader}>

                        <Text style={styles.modalTitle}>Submit Delivery Proof</Text>

                        <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>

                            <Icon name="close" size={24} color="#6c757d" />

                        </TouchableOpacity>

                    </View>



                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

                        <View style={styles.orderSummaryContainer}>

                            <Text style={styles.orderSummaryTitle}>Order Details</Text>

                            <Text style={styles.orderSummaryText}>Order ID: #{order._id.slice(-6)}</Text>

                            <Text style={styles.orderSummaryText}>Customer: {order.user?.name || 'N/A'}</Text>

                            <Text style={styles.orderSummaryText}>Amount: ₱{Number(order.totalAmount || order.amount || 0).toLocaleString()}</Text>

                        </View>



                        <TouchableOpacity

                            style={[styles.imageUploadButton, deliveryProofImage && styles.imageUploadButtonSelected]}

                            onPress={chooseImageSource}

                        >

                            <Icon

                                name={deliveryProofImage ? 'check-circle' : 'camera-alt'}

                                size={32}

                                color={deliveryProofImage ? '#28a745' : '#007bff'}

                            />

                            <Text style={[styles.imageUploadText, deliveryProofImage && styles.imageUploadTextSelected]}>

                                {deliveryProofImage ? 'Photo Selected' : 'Add Photo'}

                            </Text>

                        </TouchableOpacity>



                        {deliveryProofImage && (

                            <View style={styles.imagePreviewContainer}>

                                <Image source={{ uri: deliveryProofImage.uri }} style={styles.deliveryProofPreview} />

                            </View>

                        )}

                    </ScrollView>



                    <View style={styles.modalFooter}>

                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>

                            <Text style={styles.cancelButtonText}>Cancel</Text>

                        </TouchableOpacity>

                        <TouchableOpacity

                            style={[styles.saveButton, (!deliveryProofImage || isSubmitting) && styles.saveButtonDisabled]}

                            onPress={submitDeliveryProof}

                            disabled={!deliveryProofImage || isSubmitting}

                        >

                            {isSubmitting ? (

                                <ActivityIndicator color="#ffffff" />

                            ) : (

                                <Text style={styles.saveButtonText}>Submit & Complete</Text>

                            )}

                        </TouchableOpacity>

                    </View>

                </View>

            </View>

        </Modal>

    );

};



const ProductsTab = ({ products, categories, furnitureTypes, onProductUpdate, onProductDelete, onProductCreate, API_BASE_URL }) => {

    const [searchQuery, setSearchQuery] = useState('');

    const [categoryFilter, setCategoryFilter] = useState('all');

    const [typeFilter, setTypeFilter] = useState('all');

    const [selectedProduct, setSelectedProduct] = useState(null);

    const [showProductModal, setShowProductModal] = useState(false);

    const [isCreating, setIsCreating] = useState(false);

    const [formData, setFormData] = useState({

        name: '',

        description: '',

        price: '',

        cost: '',

        stock: '',

        length: '',

        height: '',

        width: '',

        category: [],

        furnituretype: '',

        is_bestseller: false,

        isPackage: false,

        is_customizable: false,

        imageUrl: [],

        images: null,

        labor_cost_per_day: 350,

        profit_margin: 0.5,

        overhead_cost: 500,

        estimated_days: 7,

        materials: []

    });



    const [showInactive, setShowInactive] = useState(false);



    // Base list respects the inactive toggle

    const baseProducts = products.filter(p => (showInactive ? p.status === 0 : p.status !== 0));



    const filteredProducts = baseProducts.filter(product => {

        const matchesSearch = searchQuery === '' ||

            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||

            product.description?.toLowerCase().includes(searchQuery.toLowerCase());



        const matchesCategory = categoryFilter === 'all' ||

            (product.category && Array.isArray(product.category)

                ? product.category.some(cat => cat._id === categoryFilter || cat === categoryFilter)

                : product.category === categoryFilter);



        const matchesType = typeFilter === 'all' ||

            product.furnituretype === typeFilter ||

            (product.furnituretype && product.furnituretype._id === typeFilter);



        return matchesSearch && matchesCategory && matchesType;

    });



    const openProductModal = (product = null) => {

        if (product) {

            setSelectedProduct(product);

            setIsCreating(false);

            setFormData({

                name: product.name || '',

                description: product.description || '',

                price: product.price?.toString() || '',

                cost: product.cost?.toString() || '',

                stock: product.stock?.toString() || '',

                length: product.length?.toString() || '',

                height: product.height?.toString() || '',

                width: product.width?.toString() || '',

                category: Array.isArray(product.category) ? product.category.map(cat => cat._id || cat) : [product.category?._id || product.category].filter(Boolean),

                furnituretype: product.furnituretype?._id || product.furnituretype || '',

                is_bestseller: product.is_bestseller || false,

                isPackage: product.isPackage || false,

                is_customizable: product.is_customizable || false,

                imageUrl: product.imageUrl || [],

                images: null,

                labor_cost_per_day: product.customization_options?.labor_cost_per_day || 350,

                profit_margin: product.customization_options?.profit_margin || 0.5,

                overhead_cost: product.customization_options?.overhead_cost || 500,

                estimated_days: product.customization_options?.estimated_days || 7,

                materials: product.customization_options?.materials || []

            });

        } else {

            setSelectedProduct(null);

            setIsCreating(true);

            setFormData({

                name: '',

                description: '',

                price: '',

                cost: '',

                stock: '',

                length: '',

                height: '',

                width: '',

                category: [],

                furnituretype: '',

                is_bestseller: false,

                isPackage: false,

                is_customizable: false,

                imageUrl: [],

                images: null,

                labor_cost_per_day: 350,

                profit_margin: 0.5,

                overhead_cost: 500,

                estimated_days: 7,

                materials: []

            });

        }

        setShowProductModal(true);

    };



    const closeProductModal = () => {

        setShowProductModal(false);

        setSelectedProduct(null);

        setIsCreating(false);

        setFormData({

            name: '',

            description: '',

            price: '',

            cost: '',

            stock: '',

            length: '',

            height: '',

            width: '',

            category: [],

            furnituretype: '',

            is_bestseller: false,

            isPackage: false,

            is_customizable: false,

            imageUrl: [],

            images: null,

            labor_cost_per_day: 350,

            profit_margin: 0.5,

            overhead_cost: 500,

            estimated_days: 7,

            materials: []

        });

    };



    const handleCategoryChange = (catId) => {

        setFormData(prev => {

            const exists = prev.category.includes(catId);

            return {

                ...prev,

                category: exists ?

                    prev.category.filter(c => c !== catId) :

                    [...prev.category, catId]

            };

        });

    };



    const addMaterial = () => {

        setFormData(prev => ({

            ...prev,

            materials: [

                ...prev.materials,

                { name: "", plank_2x12x10_cost: 0, plank_3x3x10_cost: 0 }

            ]

        }));

    };



    const removeMaterial = (index) => {

        setFormData(prev => ({

            ...prev,

            materials: prev.materials.filter((_, i) => i !== index)

        }));

    };



    const pickImages = async () => {

        try {

            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();



            if (permissionResult.granted === false) {

                Alert.alert('Permission Required', 'Permission to access camera roll is required!');

                return;

            }



            const result = await ImagePicker.launchImageLibraryAsync({

                mediaTypes: ImagePicker.MediaTypeOptions.Images,

                allowsMultipleSelection: true,

                quality: 0.8,

                aspect: [4, 3],

                allowsEditing: false,

            });



            if (!result.canceled && result.assets) {

                const selectedImages = result.assets.slice(0, 5);



                setFormData(prev => ({

                    ...prev,

                    images: selectedImages

                }));



                Alert.alert('Success', `${selectedImages.length} image(s) selected`);

            }

        } catch (error) {

            console.error('Error picking images:', error);

            Alert.alert('Error', 'Failed to select images');

        }

    };



    const handleInputChange = (field, value) => {

        if (field.startsWith("material_")) {

            const parts = field.split("_");

            const index = Number(parts[1]);

            const fieldName = parts.slice(2).join("_");

            setFormData(prev => {

                const mats = [...prev.materials];

                const updatedValue = fieldName.includes("cost") ? Number(value) : value;

                mats[index] = { ...mats[index], [fieldName]: updatedValue };

                return { ...prev, materials: mats };

            });

        } else {

            setFormData(prev => ({

                ...prev,

                [field]: value

            }));

        }

    };



    const handleSubmit = async () => {

        if (!formData.name || !formData.price || !formData.cost || !formData.stock ||

            !formData.length || !formData.height || !formData.width ||

            !formData.category.length || !formData.furnituretype) {

            Alert.alert('Validation Error', 'Please fill in all required fields');

            return;

        }



        try {

            let productData;



            if (formData.images && formData.images.length > 0) {

                productData = new FormData();



                productData.append('name', formData.name);

                productData.append('description', formData.description);

                productData.append('price', parseFloat(formData.price));

                productData.append('cost', parseFloat(formData.cost));

                productData.append('stock', parseInt(formData.stock));

                productData.append('length', parseFloat(formData.length));

                productData.append('height', parseFloat(formData.height));

                productData.append('width', parseFloat(formData.width));

                productData.append('furnituretype', formData.furnituretype);

                productData.append('is_bestseller', formData.is_bestseller);

                productData.append('isPackage', formData.isPackage);

                productData.append('is_customizable', formData.is_customizable);



                formData.category.forEach(catId => {

                    productData.append('category', catId);

                });



                formData.images.forEach((image, index) => {

                    productData.append('images', {

                        uri: image.uri,

                        type: image.type || 'image/jpeg',

                        name: image.fileName || `image_${index}.jpg`,

                    });

                });



                if (formData.is_customizable) {

                    productData.append('customization_options', JSON.stringify({

                        labor_cost_per_day: parseFloat(formData.labor_cost_per_day),

                        profit_margin: parseFloat(formData.profit_margin),

                        overhead_cost: parseFloat(formData.overhead_cost),

                        estimated_days: parseInt(formData.estimated_days),

                        materials: formData.materials || []

                    }));

                }

            } else {

                productData = {

                    ...formData,

                    price: parseFloat(formData.price),

                    cost: parseFloat(formData.cost),

                    stock: parseInt(formData.stock),

                    length: parseFloat(formData.length),

                    height: parseFloat(formData.height),

                    width: parseFloat(formData.width)

                };



                if (formData.is_customizable) {

                    productData.customization_options = {

                        labor_cost_per_day: parseFloat(formData.labor_cost_per_day),

                        profit_margin: parseFloat(formData.profit_margin),

                        overhead_cost: parseFloat(formData.overhead_cost),

                        estimated_days: parseInt(formData.estimated_days),

                        materials: formData.materials || []

                    };

                }

            }



            if (isCreating) {

                await onProductCreate(productData);

            } else {

                await onProductUpdate(selectedProduct._id, productData);

            }



            closeProductModal();

        } catch (error) {

            Alert.alert('Error', 'Failed to save product');

        }

    };



    const handleDeactivate = (productId) => {

        Alert.alert(

            'Deactivate Product',

            'Are you sure you want to deactivate this product? It will be hidden from users.',

            [

                { text: 'Cancel', style: 'cancel' },

                { text: 'Deactivate', style: 'destructive', onPress: () => onProductDelete(productId) }

            ]

        );

    };



    const handleActivate = (productId) => {

        Alert.alert(

            'Activate Product',

            'Do you want to make this product active again?',

            [

                { text: 'Cancel', style: 'cancel' },

                { text: 'Activate', onPress: () => onProductUpdate(productId, { status: 1 }) }

            ]

        );

    };



    const renderProductItem = ({ item, index }) => (

        <TouchableOpacity

            style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : null]}

            onPress={() => openProductModal(item)}

        >

            <View style={[styles.tableCell, { flex: 2 }]}>

                <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>

                <Text style={styles.productCategory} numberOfLines={1}>

                    {Array.isArray(item.category)

                        ? item.category.map(cat => cat.name || cat).join(', ')

                        : item.category?.name || item.category || 'N/A'}

                </Text>

            </View>

            <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>₱{Number(item.price || 0).toLocaleString()}</Text>

            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.stock}</Text>

            <View style={[styles.tableCell, { flex: 1.5, alignItems: 'flex-end' }]}>

                <View style={styles.productActions}>

                    <TouchableOpacity

                        style={styles.actionButton}

                        onPress={(e) => {

                            e.stopPropagation();

                            openProductModal(item);

                        }}

                    >

                        <Icon name="edit" size={16} color="#007bff" />

                    </TouchableOpacity>



                    {showInactive ? (

                        <TouchableOpacity

                            style={[styles.actionButton, { backgroundColor: '#e7f3ff', borderColor: '#b3d9ff' }]}

                            onPress={(e) => {

                                e.stopPropagation();

                                handleActivate(item._id);

                            }}

                        >

                            <Icon name="check-circle" size={16} color="#28a745" />

                        </TouchableOpacity>

                    ) : (

                        <TouchableOpacity

                            style={[styles.actionButton, styles.deleteButton]}

                            onPress={(e) => {

                                e.stopPropagation();

                                handleDeactivate(item._id);

                            }}

                        >

                            <Icon name="block" size={16} color="#dc3545" />

                        </TouchableOpacity>

                    )}

                </View>

            </View>

        </TouchableOpacity>

    );



    const renderFilterChip = (value, label, currentFilter, onPress) => (

        <TouchableOpacity

            key={value}

            style={[

                styles.filterChip,

                currentFilter === value && styles.filterChipActive

            ]}

            onPress={() => onPress(value)}

        >

            <Text style={[

                styles.filterChipText,

                currentFilter === value && styles.filterChipTextActive

            ]}>

                {label}

            </Text>

        </TouchableOpacity>

    );



    const renderProductsContent = () => {

        const content = [

            { type: 'header', key: 'header' },

            { type: 'addButton', key: 'addButton' },

            { type: 'searchBar', key: 'searchBar' },

            { type: 'statusToggle', key: 'statusToggle' },

            { type: 'categoryFilter', key: 'categoryFilter' },

            { type: 'typeFilter', key: 'typeFilter' },

            { type: 'resultsSummary', key: 'resultsSummary' },

            { type: 'tableTitle', key: 'tableTitle' },

            { type: 'tableHeader', key: 'tableHeader' },

        ];



        if (filteredProducts.length > 0) {

            content.push(...filteredProducts.map(product => ({

                type: 'product',

                key: product._id,

                item: product

            })));

        } else {

            content.push({ type: 'emptyState', key: 'emptyState' });

        }



        return content;

    };



    const renderProductsItem = ({ item }) => {

        switch (item.type) {

            case 'header':

                return <Text style={styles.pageTitle}>Products Management</Text>;

            case 'addButton':

                return (

                    <TouchableOpacity style={styles.addButton} onPress={() => openProductModal()}>

                        <Icon name="add" size={20} color="#ffffff" />

                        <Text style={styles.addButtonText}>Add New Product</Text>

                    </TouchableOpacity>

                );

            case 'searchBar':

                return (

                    <View style={styles.searchContainer}>

                        <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />

                        <TextInput

                            style={styles.searchInput}

                            placeholder="Search products..."

                            value={searchQuery}

                            onChangeText={setSearchQuery}

                            placeholderTextColor="#6c757d"

                        />

                        {searchQuery.length > 0 && (

                            <TouchableOpacity onPress={() => setSearchQuery('')}>

                                <Icon name="close" size={20} color="#6c757d" />

                            </TouchableOpacity>

                        )}

                    </View>

                );

            case 'statusToggle':

                return (

                    <View style={{ marginHorizontal: 15, marginBottom: 10 }}>

                        <TouchableOpacity

                            style={[styles.filterChip, showInactive && styles.filterChipActive]}

                            onPress={() => setShowInactive(prev => !prev)}

                        >

                            <Text style={[styles.filterChipText, showInactive && styles.filterChipTextActive]}>

                                {showInactive ? 'Viewing Inactive Products' : 'Show Inactive Products'}

                            </Text>

                        </TouchableOpacity>

                    </View>

                );

            case 'categoryFilter':

                return (

                    <View style={styles.filtersContainer}>

                        <Text style={styles.filtersLabel}>Filter by Category:</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>

                            {renderFilterChip('all', 'All', categoryFilter, setCategoryFilter)}

                            {categories.filter(c => c.status !== 0).map(category => renderFilterChip(category._id, category.name, categoryFilter, setCategoryFilter))}

                        </ScrollView>

                    </View>

                );

            case 'typeFilter':

                return (

                    <View style={styles.filtersContainer}>

                        <Text style={styles.filtersLabel}>Filter by Type:</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>

                            {renderFilterChip('all', 'All', typeFilter, setTypeFilter)}

                            {furnitureTypes.filter(f => f.status !== 0).map(type => renderFilterChip(type._id, type.name, typeFilter, setTypeFilter))}

                        </ScrollView>

                    </View>

                );

            case 'resultsSummary':

                return (

                    <View style={styles.resultsSummary}>

                        <Text style={styles.resultsText}>

                            Showing {filteredProducts.length} of {baseProducts.length} products

                        </Text>

                    </View>

                );

            case 'tableTitle':

                return (

                    <View style={styles.card}>

                        <Text style={styles.cardTitle}>All Products ({filteredProducts.length})</Text>

                        <Text style={styles.cardSubtitle}>Tap row to edit • Tap action buttons to modify</Text>

                    </View>

                );

            case 'tableHeader':

                return (

                    <View style={[styles.tableHeader, { backgroundColor: '#f8f9fa', marginHorizontal: 15 }]}>

                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Product</Text>

                        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Price</Text>

                        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Stock</Text>

                        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Actions</Text>

                    </View>

                );

            case 'product':

                const index = filteredProducts.findIndex(p => p._id === item.item._id);

                return (

                    <View style={{ marginHorizontal: 15 }}>

                        {renderProductItem({ item: item.item, index })}

                    </View>

                );

            case 'emptyState':

                return (

                    <View style={[styles.emptyState, { marginHorizontal: 15 }]}>

                        <Icon name="inventory" size={48} color="#6c757d" />

                        <Text style={styles.emptyStateText}>No products found</Text>

                        <Text style={styles.emptyStateSubtext}>

                            Try adjusting your search or filters

                        </Text>

                    </View>

                );

            default:

                return null;

        }

    };



    return (

        <View style={{ flex: 1 }}>

            <FlatList

                data={renderProductsContent()}

                renderItem={renderProductsItem}

                keyExtractor={(item) => item.key}

                contentContainerStyle={{ padding: 15 }}

                showsVerticalScrollIndicator={false}

            />

            <ProductModal

                isVisible={showProductModal}

                onClose={closeProductModal}

                isCreating={isCreating}

                formData={formData}

                setFormData={setFormData}

                categories={categories}

                furnitureTypes={furnitureTypes}

                handleInputChange={handleInputChange}

                handleCategoryChange={handleCategoryChange}

                pickImages={pickImages}

                handleSubmit={handleSubmit}

                addMaterial={addMaterial}

                removeMaterial={removeMaterial}

            />

        </View>

    );

};



const CustomersTab = ({ customers, onCustomerUpdate, onCustomerDelete, onCustomerCreate, API_BASE_URL }) => {

    const [searchQuery, setSearchQuery] = useState('');

    const [roleFilter, setRoleFilter] = useState('all');

    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [showCustomerModal, setShowCustomerModal] = useState(false);

    const [isCreating, setIsCreating] = useState(false);

    const [provinces, setProvinces] = useState([]);

    const [cities, setCities] = useState([]);

    const [barangays, setBarangays] = useState([]);

    const [formData, setFormData] = useState({

        name: '',

        email: '',

        phone: '',

        address: {

            fullName: '',

            addressLine1: '',

            addressLine2: '',

            provinceCode: '',

            provinceName: '',

            cityCode: '',

            cityName: '',

            brgyCode: '',

            brgyName: '',

            postalCode: ''

        },

        role: 'user'

    });



    const activeCustomers = customers.filter(c => c.status !== 0);



    const filteredCustomers = activeCustomers.filter(customer => {

        const matchesSearch = searchQuery === '' ||

            customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||

            customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||

            customer.phone?.includes(searchQuery);



        const matchesRole = roleFilter === 'all' || customer.role === roleFilter;



        return matchesSearch && matchesRole;

    });



    const fetchProvinces = async () => {

        try {

            const res = await fetch(`${API_BASE_URL}/api/psgc/provinces`);

            const data = await res.json();

            setProvinces(data);

        } catch (err) {

            console.error('Failed to fetch provinces:', err);

        }

    };



    const fetchCities = async (provinceCode, provinceName) => {

        if (!provinceCode) return;

        try {

            const endpoint = provinceName === 'Metro Manila'

                ? `/api/psgc/regions/130000000/cities`

                : `/api/psgc/provinces/${provinceCode}/cities`;

            const res = await fetch(`${API_BASE_URL}${endpoint}`);

            const data = await res.json();

            setCities(data);

        } catch (err) {

            console.error('Failed to fetch cities:', err);

        }

    };



    const fetchBarangays = async (cityCode) => {

        if (!cityCode) return;

        try {

            const res = await fetch(`${API_BASE_URL}/api/psgc/cities/${cityCode}/barangays`);

            const data = await res.json();

            setBarangays(data);

        } catch (err) {

            console.error('Failed to fetch barangays:', err);

        }

    };



    const openCustomerModal = async (customer = null) => {

        await fetchProvinces();



        if (customer) {

            setSelectedCustomer(customer);

            setIsCreating(false);

            const customerAddress = customer.address || {};

            setFormData({

                name: customer.name || '',

                email: customer.email || '',

                phone: customer.phone || '',

                address: {

                    fullName: customerAddress.fullName || customer.name || '',

                    addressLine1: customerAddress.addressLine1 || '',

                    addressLine2: customerAddress.addressLine2 || '',

                    provinceCode: customerAddress.provinceCode || '',

                    provinceName: customerAddress.provinceName || '',

                    cityCode: customerAddress.cityCode || '',

                    cityName: customerAddress.cityName || '',

                    brgyCode: customerAddress.brgyCode || '',

                    brgyName: customerAddress.brgyName || '',

                    postalCode: customerAddress.postalCode || ''

                },

                role: customer.role || 'user'

            });



            if (customerAddress.provinceCode) {

                await fetchCities(customerAddress.provinceCode, customerAddress.provinceName);

                if (customerAddress.cityCode) {

                    await fetchBarangays(customerAddress.cityCode);

                }

            }

        } else {

            setSelectedCustomer(null);

            setIsCreating(true);

            setFormData({

                name: '',

                email: '',

                phone: '',

                address: {

                    fullName: '',

                    addressLine1: '',

                    addressLine2: '',

                    provinceCode: '',

                    provinceName: '',

                    cityCode: '',

                    cityName: '',

                    brgyCode: '',

                    brgyName: '',

                    postalCode: ''

                },

                role: 'user'

            });

            setCities([]);

            setBarangays([]);

        }

        setShowCustomerModal(true);

    };



    const closeCustomerModal = () => {

        setShowCustomerModal(false);

        setSelectedCustomer(null);

        setIsCreating(false);

        setFormData({

            name: '',

            email: '',

            phone: '',

            address: {

                fullName: '',

                addressLine1: '',

                addressLine2: '',

                provinceCode: '',

                provinceName: '',

                cityCode: '',

                cityName: '',

                brgyCode: '',

                brgyName: '',

                postalCode: ''

            },

            role: 'user'

        });

    };



    const handleInputChange = (field, value) => {

        setFormData(prev => ({

            ...prev,

            [field]: value

        }));

    };



    const handleAddressChange = (field, value) => {

        setFormData(prev => {

            const newAddress = { ...prev.address, [field]: value };



            if (field.endsWith('Code')) {

                const nameField = field.replace('Code', 'Name');

                let sourceArray = [];

                if (field === 'provinceCode') sourceArray = provinces;

                else if (field === 'cityCode') sourceArray = cities;

                else if (field === 'brgyCode') sourceArray = barangays;



                const match = sourceArray.find(item => item.code === value);

                newAddress[nameField] = match ? match.name : '';

            }



            if (field === 'provinceCode') {

                newAddress.cityCode = '';

                newAddress.cityName = '';

                newAddress.brgyCode = '';

                newAddress.brgyName = '';

                setCities([]);

                setBarangays([]);

                if (value) {

                    const selectedProvince = provinces.find(p => p.code === value);

                    fetchCities(value, selectedProvince?.name);

                }

            }



            if (field === 'cityCode') {

                newAddress.brgyCode = '';

                newAddress.brgyName = '';

                setBarangays([]);

                if (value) fetchBarangays(value);

            }



            return { ...prev, address: newAddress };

        });

    };



    const handleSubmit = async () => {

        if (!formData.name || !formData.email || !formData.phone ||

            !formData.address.fullName || !formData.address.addressLine1 ||

            !formData.address.provinceCode || !formData.address.cityCode || !formData.address.brgyCode) {

            Alert.alert('Validation Error', 'Please fill in all required fields including complete address');

            return;

        }



        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(formData.email)) {

            Alert.alert('Validation Error', 'Please enter a valid email address');

            return;

        }



        try {

            if (isCreating) {

                const customerData = {

                    ...formData,

                    password: 'defaultPassword123'

                };

                await onCustomerCreate(customerData);

            } else {

                await onCustomerUpdate(selectedCustomer._id, formData);

            }



            closeCustomerModal();

        } catch (error) {

            Alert.alert('Error', 'Failed to save customer');

        }

    };



    const handleDeactivate = (customerId) => {

        Alert.alert(

            'Deactivate Customer',

            'Are you sure you want to deactivate this customer? They will no longer be able to log in.',

            [

                { text: 'Cancel', style: 'cancel' },

                { text: 'Deactivate', style: 'destructive', onPress: () => onCustomerDelete(customerId) }

            ]

        );

    };



    const toggleUserRole = (customerId, currentRole) => {

        const newRole = currentRole === 'user' ? 'admin' : 'user';

        Alert.alert(

            'Change Role',

            `Are you sure you want to change this user's role from ${currentRole} to ${newRole}?`,

            [

                { text: 'Cancel', style: 'cancel' },

                { text: 'Change', onPress: () => onCustomerUpdate(customerId, { role: newRole }) }

            ]

        );

    };



    const renderCustomerItem = ({ item, index }) => (

        <TouchableOpacity

            style={[styles.tableRow, index % 2 === 0 ? styles.tableRowAlt : null]}

            onPress={() => openCustomerModal(item)}

        >

            <View style={[styles.tableCell, { flex: 2 }]}>

                <Text style={styles.customerName} numberOfLines={1}>{item.name}</Text>

                <Text style={styles.customerEmail} numberOfLines={1}>{item.email}</Text>

            </View>


            <View style={[styles.tableCell, { flex: 1.5, alignItems: 'flex-end' }]}>

                <View style={styles.customerActions}>

                    <TouchableOpacity

                        style={[styles.roleButton, item.role === 'admin' ? styles.adminRole : styles.userRole]}

                        onPress={(e) => {

                            e.stopPropagation();

                            toggleUserRole(item._id, item.role);

                        }}

                    >

                        <Text style={[styles.roleText, item.role === 'admin' ? styles.adminRoleText : styles.userRoleText]}>

                            {item.role}

                        </Text>

                    </TouchableOpacity>

                    <TouchableOpacity

                        style={styles.actionButton}

                        onPress={(e) => {

                            e.stopPropagation();

                            openCustomerModal(item);

                        }}

                    >

                        <Icon name="edit" size={16} color="#007bff" />

                    </TouchableOpacity>

                    <TouchableOpacity

                        style={[styles.actionButton, styles.deleteButton]}

                        onPress={(e) => {

                            e.stopPropagation();

                            handleDeactivate(item._id);

                        }}

                    >

                        <Icon name="block" size={16} color="#dc3545" />

                    </TouchableOpacity>

                </View>

            </View>

        </TouchableOpacity>

    );



    const renderRoleFilter = (role) => (

        <TouchableOpacity

            key={role}

            style={[

                styles.filterChip,

                roleFilter === role && styles.filterChipActive

            ]}

            onPress={() => setRoleFilter(role)}

        >

            <Text style={[

                styles.filterChipText,

                roleFilter === role && styles.filterChipTextActive

            ]}>

                {role === 'all' ? 'All' : role === 'user' ? 'Users' : 'Admins'}

            </Text>

        </TouchableOpacity>

    );



    const renderCustomersContent = () => {

        const content = [

            { type: 'header', key: 'header' },

            { type: 'addButton', key: 'addButton' },

            { type: 'searchBar', key: 'searchBar' },

            { type: 'roleFilter', key: 'roleFilter' },

            { type: 'resultsSummary', key: 'resultsSummary' },

            { type: 'tableTitle', key: 'tableTitle' },

            { type: 'tableHeader', key: 'tableHeader' },

        ];



        if (filteredCustomers.length > 0) {

            content.push(...filteredCustomers.map(customer => ({

                type: 'customer',

                key: customer._id,

                item: customer

            })));

        } else {

            content.push({ type: 'emptyState', key: 'emptyState' });

        }



        return content;

    };



    const renderCustomersItem = ({ item }) => {

        switch (item.type) {

            case 'header':

                return <Text style={styles.pageTitle}>Customers Management</Text>;

            case 'addButton':

                return (

                    <TouchableOpacity style={styles.addButton} onPress={() => openCustomerModal()}>

                        <Icon name="add" size={20} color="#ffffff" />

                        <Text style={styles.addButtonText}>Add New Customer</Text>

                    </TouchableOpacity>

                );

            case 'searchBar':

                return (

                    <View style={styles.searchContainer}>

                        <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />

                        <TextInput

                            style={styles.searchInput}

                            placeholder="Search customers..."

                            value={searchQuery}

                            onChangeText={setSearchQuery}

                            placeholderTextColor="#6c757d"

                        />

                        {searchQuery.length > 0 && (

                            <TouchableOpacity onPress={() => setSearchQuery('')}>

                                <Icon name="close" size={20} color="#6c757d" />

                            </TouchableOpacity>

                        )}

                    </View>

                );

            case 'roleFilter':

                return (

                    <View style={styles.filtersContainer}>

                        <Text style={styles.filtersLabel}>Filter by Role:</Text>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>

                            {renderRoleFilter('all')}

                            {renderRoleFilter('user')}

                            {renderRoleFilter('admin')}

                        </ScrollView>

                    </View>

                );

            case 'resultsSummary':

                return (

                    <View style={styles.resultsSummary}>

                        <Text style={styles.resultsText}>

                            Showing {filteredCustomers.length} of {activeCustomers.length} customers

                        </Text>

                    </View>

                );

            case 'tableTitle':

                return (

                    <View style={styles.card}>

                        <Text style={styles.cardTitle}>All Customers ({filteredCustomers.length})</Text>

                        <Text style={styles.cardSubtitle}>Tap row to edit • Tap role to change • Tap actions to modify</Text>

                    </View>

                );

            case 'tableHeader':

                return (

                    <View style={[styles.tableHeader, { backgroundColor: '#f8f9fa', marginHorizontal: 15 }]}>

                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Customer</Text>



                        <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Actions</Text>

                    </View>

                );

            case 'customer':

                const index = filteredCustomers.findIndex(c => c._id === item.item._id);

                return (

                    <View style={{ marginHorizontal: 15 }}>

                        {renderCustomerItem({ item: item.item, index })}

                    </View>

                );

            case 'emptyState':

                return (

                    <View style={[styles.emptyState, { marginHorizontal: 15 }]}>

                        <Icon name="people" size={48} color="#6c757d" />

                        <Text style={styles.emptyStateText}>No customers found</Text>

                        <Text style={styles.emptyStateSubtext}>

                            Try adjusting your search or filters

                        </Text>

                    </View>

                );

            default:

                return null;

        }

    };



    return (

        <View style={{ flex: 1 }}>

            <FlatList

                data={renderCustomersContent()}

                renderItem={renderCustomersItem}

                keyExtractor={(item) => item.key}

                contentContainerStyle={{ padding: 15 }}

                showsVerticalScrollIndicator={false}

            />

            <CustomerModal

                isVisible={showCustomerModal}

                onClose={closeCustomerModal}

                isCreating={isCreating}

                formData={formData}

                setFormData={setFormData}

                provinces={provinces}

                cities={cities}

                barangays={barangays}

                handleInputChange={handleInputChange}

                handleAddressChange={handleAddressChange}

                handleSubmit={handleSubmit}

            />

        </View>

    );

};



const SettingsTab = ({ categories, furnitureTypes, onCategoryCreate, onCategoryUpdate, onCategoryDelete, onFurnitureTypeCreate, onFurnitureTypeUpdate, onFurnitureTypeDelete, API_BASE_URL }) => {

    const [activeSettingsTab, setActiveSettingsTab] = useState('categories');

    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const [showFurnitureModal, setShowFurnitureModal] = useState(false);

    const [isCreating, setIsCreating] = useState(false);

    const [selectedItem, setSelectedItem] = useState(null);

    const [categoryFormData, setCategoryFormData] = useState({ name: '' });

    const [furnitureFormData, setFurnitureFormData] = useState({ name: '' });



    const [showInactiveCategories, setShowInactiveCategories] = useState(false);

    const baseCategories = categories.filter(c => showInactiveCategories ? c.status === 0 : c.status !== 0);

    const activeFurnitureTypes = furnitureTypes.filter(f => f.status !== 0);



    const openCategoryModal = (category = null) => {

        if (category) {

            setSelectedItem(category);

            setIsCreating(false);

            setCategoryFormData({ name: category.name || '' });

        } else {

            setSelectedItem(null);

            setIsCreating(true);

            setCategoryFormData({ name: '' });

        }

        setShowCategoryModal(true);

    };



    const closeCategoryModal = () => {

        setShowCategoryModal(false);

        setSelectedItem(null);

        setIsCreating(false);

        setCategoryFormData({ name: '' });

    };



    const handleCategorySubmit = async () => {

        if (!categoryFormData.name.trim()) {

            Alert.alert('Validation Error', 'Category name is required');

            return;

        }



        try {

            if (isCreating) {

                await onCategoryCreate(categoryFormData);

            } else {

                await onCategoryUpdate(selectedItem._id, categoryFormData);

            }

            closeCategoryModal();

        } catch (error) {

            Alert.alert('Error', 'Failed to save category');

        }

    };



    const handleCategoryDeactivate = (categoryId) => {

        Alert.alert(

            'Deactivate Category',

            'Are you sure you want to deactivate this category?',

            [

                { text: 'Cancel', style: 'cancel' },

                { text: 'Deactivate', style: 'destructive', onPress: () => onCategoryDelete(categoryId) }

            ]

        );

    };



    const handleCategoryActivate = (categoryId) => {

        Alert.alert(

            'Activate Category',

            'Do you want to make this category active again?',

            [

                { text: 'Cancel', style: 'cancel' },

                { text: 'Activate', onPress: () => onCategoryUpdate(categoryId, { status: 1 }) }

            ]

        );

    };



    const openFurnitureModal = (furnitureType = null) => {

        if (furnitureType) {

            setSelectedItem(furnitureType);

            setIsCreating(false);

            setFurnitureFormData({ name: furnitureType.name || '' });

        } else {

            setSelectedItem(null);

            setIsCreating(true);

            setFurnitureFormData({ name: '' });

        }

        setShowFurnitureModal(true);

    };



    const closeFurnitureModal = () => {
        setShowFurnitureModal(false);
        setSelectedItem(null);
        setIsCreating(false);
        setFurnitureFormData({ name: '' });
    };



    const handleFurnitureSubmit = async () => {

        if (!furnitureFormData.name.trim()) {

            Alert.alert('Validation Error', 'Furniture type name is required');

            return;

        }



        try {

            if (isCreating) {

                await onFurnitureTypeCreate(furnitureFormData);

            } else {

                await onFurnitureTypeUpdate(selectedItem._id, furnitureFormData);

            }

            closeFurnitureModal();

        } catch (error) {

            Alert.alert('Error', 'Failed to save furniture type');

        }

    };



    const handleFurnitureDeactivate = (furnitureTypeId) => {

        Alert.alert(

            'Deactivate Furniture Type',

            'Are you sure you want to deactivate this furniture type?',

            [

                { text: 'Cancel', style: 'cancel' },

                { text: 'Deactivate', style: 'destructive', onPress: () => onFurnitureTypeDelete(furnitureTypeId) }

            ]

        );

    };



    const handleFurnitureActivate = (furnitureTypeId) => {

        Alert.alert(

            'Activate Furniture Type',

            'Do you want to make this furniture type active again?',

            [

                { text: 'Cancel', style: 'cancel' },

                { text: 'Activate', onPress: () => onFurnitureTypeUpdate(furnitureTypeId, { status: 1 }) }

            ]

        );

    };



    const renderCategoryItem = ({ item, index }) => (

        <View style={[styles.settingsRow, index % 2 === 0 ? styles.settingsRowAlt : null]}>

            <View style={styles.settingsItemInfo}>

                <Text style={styles.settingsItemName}>{item.name}</Text>

                <Text style={styles.settingsItemDate}>

                    Created: {new Date(item.createdAt || Date.now()).toLocaleDateString()}

                </Text>

            </View>

            <View style={styles.settingsActions}>

                <TouchableOpacity

                    style={styles.settingsActionButton}

                    onPress={() => openCategoryModal(item)}

                >

                    <Icon name="edit" size={18} color="#007bff" />

                </TouchableOpacity>

                {showInactiveCategories ? (

                    <TouchableOpacity

                        style={[styles.settingsActionButton, { backgroundColor: '#e7f3ff', borderColor: '#b3d9ff' }]}

                        onPress={() => handleCategoryActivate(item._id)}

                    >

                        <Icon name="check-circle" size={18} color="#28a745" />

                    </TouchableOpacity>

                ) : (

                    <TouchableOpacity

                        style={[styles.settingsActionButton, styles.deleteActionButton]}

                        onPress={() => handleCategoryDeactivate(item._id)}

                    >

                        <Icon name="block" size={18} color="#dc3545" />

                    </TouchableOpacity>

                )}

            </View>

        </View>

    );



    const [showInactiveFurniture, setShowInactiveFurniture] = useState(false);

    const baseFurnitureTypes = furnitureTypes.filter(f => showInactiveFurniture ? f.status === 0 : f.status !== 0);



    const renderFurnitureItem = ({ item, index }) => (

        <View style={[styles.settingsRow, index % 2 === 0 ? styles.settingsRowAlt : null]}>

            <View style={styles.settingsItemInfo}>

                <Text style={styles.settingsItemName}>{item.name}</Text>

                <Text style={styles.settingsItemDate}>

                    Created: {new Date(item.createdAt || Date.now()).toLocaleDateString()}

                </Text>

            </View>

            <View style={styles.settingsActions}>

                <TouchableOpacity

                    style={styles.settingsActionButton}

                    onPress={() => openFurnitureModal(item)}

                >

                    <Icon name="edit" size={18} color="#007bff" />

                </TouchableOpacity>

                {showInactiveFurniture ? (

                    <TouchableOpacity

                        style={[styles.settingsActionButton, { backgroundColor: '#e7f3ff', borderColor: '#b3d9ff' }]}

                        onPress={() => handleFurnitureActivate(item._id)}

                    >

                        <Icon name="check-circle" size={18} color="#28a745" />

                    </TouchableOpacity>

                ) : (

                    <TouchableOpacity

                        style={[styles.settingsActionButton, styles.deleteActionButton]}

                        onPress={() => handleFurnitureDeactivate(item._id)}

                    >

                        <Icon name="block" size={18} color="#dc3545" />

                    </TouchableOpacity>

                )}

            </View>

        </View>

    );



    const renderSettingsContent = () => {

        const content = [

            { type: 'header', key: 'header' },

            { type: 'navigation', key: 'navigation' },

        ];



        if (activeSettingsTab === 'categories') {

            content.push(

                { type: 'settingsHeader', key: 'settingsHeader', data: { title: 'Product Categories', subtitle: `Manage product categories (${baseCategories.length})`, buttonText: 'Add Category', onPress: openCategoryModal } }

            );



            if (baseCategories.length > 0) {

                content.push(...baseCategories.map(category => ({

                    type: 'categoryItem',

                    key: category._id,

                    item: category

                })));

            } else {

                content.push({ type: 'emptyCategoriesState', key: 'emptyCategoriesState' });

            }

        } else if (activeSettingsTab === 'furniture') {

            content.push(

                { type: 'settingsHeader', key: 'settingsHeader', data: { title: 'Furniture Types', subtitle: `Manage furniture types (${baseFurnitureTypes.length})`, buttonText: 'Add Type', onPress: openFurnitureModal } }

            );



            if (baseFurnitureTypes.length > 0) {

                content.push(...baseFurnitureTypes.map(furnitureType => ({

                    type: 'furnitureItem',

                    key: furnitureType._id,

                    item: furnitureType

                })));

            } else {

                content.push({ type: 'emptyFurnitureState', key: 'emptyFurnitureState' });

            }

        }



        return content;

    };



    const renderSettingsItem = ({ item }) => {

        switch (item.type) {

            case 'header':

                return <Text style={styles.pageTitle}>Settings</Text>;

            case 'navigation':

                return (

                    <View style={styles.settingsNav}>

                        <TouchableOpacity

                            style={[styles.settingsNavItem, activeSettingsTab === 'categories' && styles.settingsNavItemActive]}

                            onPress={() => setActiveSettingsTab('categories')}

                        >

                            <Icon name="category" size={18} color={activeSettingsTab === 'categories' ? "#007bff" : "#6c757d"} />

                            <Text style={[styles.settingsNavText, activeSettingsTab === 'categories' && styles.settingsNavTextActive]}>

                                Categories

                            </Text>

                        </TouchableOpacity>

                        <TouchableOpacity

                            style={[styles.settingsNavItem, activeSettingsTab === 'furniture' && styles.settingsNavItemActive]}

                            onPress={() => setActiveSettingsTab('furniture')}

                        >

                            <Icon name="chair" size={18} color={activeSettingsTab === 'furniture' ? "#007bff" : "#6c757d"} />

                            <Text style={[styles.settingsNavText, activeSettingsTab === 'furniture' && styles.settingsNavTextActive]}>

                                Furniture Types

                            </Text>

                        </TouchableOpacity>

                    </View>

                );

            case 'settingsHeader':

                return (

                    <View style={styles.settingsHeader}>

                        <View>

                            <Text style={styles.settingsTitle}>{item.data.title}</Text>

                            <Text style={styles.settingsSubtitle}>{item.data.subtitle}</Text>

                        </View>

                        <TouchableOpacity style={styles.addButton} onPress={item.data.onPress}>

                            <Icon name="add" size={16} color="#ffffff" />

                            <Text style={[styles.addButtonText, { fontSize: 14 }]}>{item.data.buttonText}</Text>

                        </TouchableOpacity>

                    </View>

                );

            case 'categoryItem':

                const categoryIndex = baseCategories.findIndex(c => c._id === item.item._id);

                return renderCategoryItem({ item: item.item, index: categoryIndex });

            case 'furnitureItem':

                const furnitureIndex = baseFurnitureTypes.findIndex(f => f._id === item.item._id);

                return renderFurnitureItem({ item: item.item, index: furnitureIndex });

            case 'emptyCategoriesState':

                return (

                    <View style={styles.emptySettingsState}>

                        <Icon name="category" size={48} color="#6c757d" />

                        <Text style={styles.emptyStateText}>No categories found</Text>

                        <Text style={styles.emptyStateSubtext}>Add your first product category</Text>

                    </View>

                );

            case 'emptyFurnitureState':

                return (

                    <View style={styles.emptySettingsState}>

                        <Icon name="chair" size={48} color="#6c757d" />

                        <Text style={styles.emptyStateText}>No furniture types found</Text>

                        <Text style={styles.emptyStateSubtext}>Add your first furniture type</Text>

                    </View>

                );

            case 'statusToggleFurn':

                return (

                    <View style={{ marginHorizontal: 15, marginBottom: 10 }}>

                        <TouchableOpacity

                            style={[styles.filterChip, showInactiveFurniture && styles.filterChipActive]}

                            onPress={() => setShowInactiveFurniture(prev => !prev)}

                        >

                            <Text style={[styles.filterChipText, showInactiveFurniture && styles.filterChipTextActive]}>

                                {showInactiveFurniture ? 'Viewing Inactive Types' : 'Show Inactive Types'}

                            </Text>

                        </TouchableOpacity>

                    </View>

                );

            default:

                return null;

        }

    };



    return (

        <View style={{ flex: 1 }}>

            <FlatList

                data={renderSettingsContent()}

                renderItem={renderSettingsItem}

                keyExtractor={(item) => item.key}

                contentContainerStyle={{ padding: 15 }}

                showsVerticalScrollIndicator={false}

            />

            <CategoryModal

                isVisible={showCategoryModal}

                onClose={closeCategoryModal}

                isCreating={isCreating}

                formData={categoryFormData}

                setFormData={setCategoryFormData}

                onSubmit={handleCategorySubmit}

            />

            <FurnitureModal

                isVisible={showFurnitureModal}

                onClose={closeFurnitureModal}

                isCreating={isCreating}

                formData={furnitureFormData}

                setFormData={setFurnitureFormData}

                onSubmit={handleFurnitureSubmit}

            />

        </View>

    );

};



const ChatModal = ({

    isVisible,

    onClose,

    chat,

    getAuthToken

}) => {

    if (!isVisible || !chat) return null;



    const [messages, setMessages] = useState(chat.messages || []);

    const [newMessage, setNewMessage] = useState('');

    const [sending, setSending] = useState(false);

    const messagesListRef = useRef(null);

    const lastSendTimeRef = useRef(0);



    useEffect(() => {

        if (!socket) return;



        const handleReceiveMessage = (message) => {

            if (message.chatId === chat._id) {

                setMessages(prev => {

                    const filteredMessages = prev.filter(msg =>

                        !(msg.isOptimistic &&

                            msg.content === message.content &&

                            msg.sender?.role === message.sender?.role)

                    );



                    const exists = filteredMessages.some(msg =>

                        msg._id === message._id ||

                        (msg.content === message.content &&

                            msg.sender?._id === message.sender?._id &&

                            Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000)

                    );



                    if (exists) {

                        return filteredMessages;

                    }



                    return [...filteredMessages, message];

                });

            }

        };



        const handleMessageSent = () => setSending(false);



        const handleMessageError = (error) => {

            console.error('Message error:', error);

            setSending(false);

            Alert.alert('Error', error.error || 'Failed to send message');

        };



        socket.on('receiveMessage', handleReceiveMessage);

        socket.on('messageSent', handleMessageSent);

        socket.on('messageError', handleMessageError);



        socket.emit('joinChat', chat._id);



        return () => {

            socket.off('receiveMessage', handleReceiveMessage);

            socket.off('messageSent', handleMessageSent);

            socket.off('messageError', handleMessageError);

            socket.emit('leaveChat', chat._id);

        };

    }, [chat._id]);



    useEffect(() => {

        if (messages.length > 0) {

            setTimeout(() => messagesListRef.current?.scrollToEnd({ animated: true }), 100);

        }

    }, [messages.length]);



    const sendMessage = async () => {

        if (!newMessage.trim() || sending || !socket) return;



        const now = Date.now();

        if (now - lastSendTimeRef.current < 500) {

            return;

        }

        lastSendTimeRef.current = now;



        const messageText = newMessage.trim();

        setSending(true);



        let adminUserId;

        try {

            const token = await getAuthToken();

            if (!token) {

                setSending(false);

                return;

            }

            const payload = JSON.parse(atob(token.split('.')[1]));

            adminUserId = payload.id;

        } catch (error) {

            console.error('Error getting admin user ID:', error);

            setSending(false);

            return;

        }



        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const optimisticMessage = {

            _id: tempId,

            content: messageText,

            sender: { _id: adminUserId, name: 'Admin', role: 'admin' },

            timestamp: new Date().toISOString(),

            isOptimistic: true,

        };



        setNewMessage('');

        setMessages(prev => {

            const duplicate = prev.some(msg =>

                msg.content === messageText &&

                msg.sender?.role === 'admin' &&

                Math.abs(new Date(msg.timestamp) - new Date()) < 2000

            );

            if (duplicate) {

                return prev;

            }

            return [...prev, optimisticMessage];

        });

        setTimeout(() => messagesListRef.current?.scrollToEnd({ animated: true }), 50);



        socket.emit('sendMessage', {

            chatId: chat._id,

            senderId: adminUserId,

            content: messageText

        });

    };



    const renderMessageItem = React.useCallback(({ item }) => {

        const isAdminMessage = item.sender?.role === 'admin';



        return (

            <View style={[styles.messageContainer, isAdminMessage ? styles.adminMessage : styles.userMessage]}>

                <View style={styles.messageHeader}>

                    <Text style={[styles.messageSender, isAdminMessage && { color: '#ffffff' }]}>

                        {item.sender?.name || (isAdminMessage ? 'Admin' : 'Customer')}

                    </Text>

                    <Text style={[styles.messageTime, isAdminMessage && { color: '#e3f2fd' }]}>

                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

                    </Text>

                </View>

                <Text style={[styles.messageText, isAdminMessage && { color: '#ffffff' }]}>{item.content}</Text>

            </View>

        );

    }, []);



    return (

        <Modal

            visible={isVisible}

            animationType="slide"

            transparent={false}

            onRequestClose={onClose}

        >

            <SafeAreaView style={styles.chatModalContainer}>

                <View style={styles.chatModalHeader}>

                    <View style={styles.chatCustomerInfo}>

                        <Icon name="person" size={24} color="#007bff" />

                        <View style={styles.chatCustomerDetails}>

                            <Text style={styles.modalTitle}>

                                {chat?.participants?.find(p => p.role === 'user')?.name || 'Unknown User'}

                            </Text>

                            <Text style={styles.chatCustomerEmail}>

                                {chat?.participants?.find(p => p.role === 'user')?.email || 'No email'}

                            </Text>

                        </View>

                    </View>

                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>

                        <Icon name="close" size={24} color="#6c757d" />

                    </TouchableOpacity>

                </View>



                <View style={styles.chatMessagesContainer}>

                    {messages.length > 0 ? (

                        <FlatList

                            ref={messagesListRef}

                            data={messages}

                            renderItem={renderMessageItem}

                            keyExtractor={(item) => item._id || `msg_${item.timestamp}`}

                            style={styles.messagesList}

                            contentContainerStyle={styles.messagesContent}

                            showsVerticalScrollIndicator={false}

                        />

                    ) : (

                        <View style={styles.emptyChat}>

                            <Icon name="chat-bubble-outline" size={48} color="#6c757d" />

                            <Text style={styles.emptyChatText}>No messages yet</Text>

                            <Text style={styles.emptyChatSubtext}>Start the conversation</Text>

                        </View>

                    )}

                </View>



                <View style={styles.chatInputContainer}>

                    <TextInput

                        style={styles.chatInput}

                        placeholder="Type your message..."

                        value={newMessage}

                        onChangeText={setNewMessage}

                        multiline

                        maxLength={500}

                    />

                    <TouchableOpacity

                        style={[styles.chatSendButton, (!newMessage.trim() || sending) && styles.chatSendButtonDisabled]}

                        onPress={sendMessage}

                        disabled={!newMessage.trim() || sending}

                    >

                        {sending ? (

                            <ActivityIndicator size="small" color="#ffffff" />

                        ) : (

                            <Icon name="send" size={20} color="#ffffff" />

                        )}

                    </TouchableOpacity>

                </View>

            </SafeAreaView>

        </Modal>

    );

};



const AdminChatTab = ({ API_BASE_URL }) => {

    const [chats, setChats] = useState([]);

    const [selectedChat, setSelectedChat] = useState(null);

    const [showChatModal, setShowChatModal] = useState(false);

    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');



    const getAuthToken = async () => AsyncStorage.getItem('token');



    useEffect(() => {

        if (!socket.connected) {

            socket.connect();

        }



        const handleConnect = () => console.log('Socket connected successfully');

        const handleDisconnect = () => console.log('Socket disconnected');

        const handleConnectError = (error) => console.error('Socket connection error:', error);



        const handleReceiveMessage = (message) => {

            setChats(prevChats =>

                prevChats.map(chat => {

                    if (chat._id === message.chatId) {

                        const updatedMessages = [...(chat.messages || [])];

                        const messageExists = updatedMessages.some(msg =>

                            msg._id === message._id ||

                            (msg.content === message.content &&

                                Math.abs(new Date(msg.timestamp) - new Date(message.timestamp)) < 1000)

                        );

                        if (!messageExists) {

                            updatedMessages.push(message);

                            return { ...chat, messages: updatedMessages, lastMessageAt: message.timestamp };

                        }

                        return chat;

                    }

                    return chat;

                })

            );

        };



        socket.on('connect', handleConnect);

        socket.on('disconnect', handleDisconnect);

        socket.on('connect_error', handleConnectError);

        socket.on('receiveMessage', handleReceiveMessage);



        fetchAllChats();



        return () => {

            socket.off('connect', handleConnect);

            socket.off('disconnect', handleDisconnect);

            socket.off('connect_error', handleConnectError);

            socket.off('receiveMessage', handleReceiveMessage);

        };

    }, []);



    const fetchAllChats = async () => {

        setLoading(true);

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/chats`, {

                headers: { 'Authorization': `Bearer ${token}` }

            });



            const data = await response.json();

            if (response.ok) {

                setChats(data || []);

            } else {

                Alert.alert('Error', 'Failed to fetch chats');

            }

        } catch (error) {

            console.error('Error fetching chats:', error);

            Alert.alert('Network Error', 'Unable to fetch chats');

        } finally {

            setLoading(false);

        }

    };



    const filteredChats = React.useMemo(() => {

        if (!searchQuery.trim()) return chats;

        const searchLower = searchQuery.toLowerCase();

        return chats.filter(chat => {

            const customer = chat.participants?.find(p => p.role === 'user');

            return customer?.name?.toLowerCase().includes(searchLower) ||

                customer?.email?.toLowerCase().includes(searchLower);

        });

    }, [chats, searchQuery]);



    const openChatModal = (chat) => {

        setSelectedChat(chat);

        setShowChatModal(true);

    };



    const closeChatModal = () => {

        setSelectedChat(null);

        setShowChatModal(false);

    };



    const renderChatItem = React.useCallback(({ item, index }) => {

        const customer = item.participants?.find(p => p.role === 'user');

        const lastMessage = item.messages?.[item.messages.length - 1];



        return (

            <TouchableOpacity

                style={[styles.chatRow, index % 2 === 0 ? styles.chatRowAlt : null]}

                onPress={() => openChatModal(item)}

            >

                <View style={styles.chatAvatar}>

                    <Icon name="person" size={24} color="#007bff" />

                </View>



                <View style={styles.chatInfo}>

                    <View style={styles.chatHeader}>

                        <Text style={styles.customerName}>{customer?.name || 'Unknown User'}</Text>

                        <Text style={styles.chatTime}>

                            {lastMessage ? new Date(lastMessage.timestamp).toLocaleDateString() : 'No messages'}

                        </Text>

                    </View>



                    <Text style={styles.lastMessage} numberOfLines={1}>

                        {lastMessage ?

                            `${lastMessage.sender?.name === customer?.name ? '' : 'You: '}${lastMessage.content}` :

                            'No messages yet'

                        }

                    </Text>



                    <Text style={styles.customerEmail}>{customer?.email || 'No email'}</Text>

                </View>



                <View style={styles.chatActions}>

                    <View style={styles.messageCount}>

                        <Text style={styles.messageCountText}>{item.messages?.length || 0}</Text>

                    </View>

                    <Icon name="chevron-right" size={20} color="#6c757d" />

                </View>

            </TouchableOpacity>

        );

    }, []);



    const renderChatContent = () => {

        const content = [

            { type: 'header', key: 'header' },

            { type: 'searchBar', key: 'searchBar' },

            { type: 'chatStats', key: 'chatStats' },

            { type: 'resultsSummary', key: 'resultsSummary' },

            { type: 'tableTitle', key: 'tableTitle' },

        ];



        if (loading) {

            content.push({ type: 'loading', key: 'loading' });

        } else if (filteredChats.length > 0) {

            content.push(...filteredChats.map(chat => ({

                type: 'chat',

                key: chat._id,

                item: chat

            })));

        } else {

            content.push({ type: 'emptyState', key: 'emptyState' });

        }



        return content;

    };



    const renderChatTabItem = ({ item }) => {

        switch (item.type) {

            case 'header':

                return <Text style={styles.pageTitle}>Chat Management</Text>;

            case 'searchBar':

                return (

                    <View style={styles.searchContainer}>

                        <Icon name="search" size={20} color="#6c757d" style={styles.searchIcon} />

                        <TextInput

                            style={styles.searchInput}

                            placeholder="Search customers..."

                            value={searchQuery}

                            onChangeText={setSearchQuery}

                            placeholderTextColor="#6c757d"

                        />

                        {searchQuery.length > 0 && (

                            <TouchableOpacity onPress={() => setSearchQuery('')}>

                                <Icon name="close" size={20} color="#6c757d" />

                            </TouchableOpacity>

                        )}

                    </View>

                );

            case 'chatStats':

                return (

                    <View style={styles.chatStats}>

                        <View style={styles.chatStatCard}>

                            <Icon name="chat" size={24} color="#007bff" />

                            <Text style={styles.chatStatValue}>{filteredChats.length}</Text>

                            <Text style={styles.chatStatLabel}>Total Chats</Text>

                        </View>

                        <View style={styles.chatStatCard}>

                            <Icon name="message" size={24} color="#28a745" />

                            <Text style={styles.chatStatValue}>

                                {filteredChats.reduce((sum, chat) => sum + (chat.messages?.length || 0), 0)}

                            </Text>

                            <Text style={styles.chatStatLabel}>Total Messages</Text>

                        </View>

                        <View style={styles.chatStatCard}>

                            <Icon name="people" size={24} color="#ffc107" />

                            <Text style={styles.chatStatValue}>

                                {filteredChats.filter(chat => chat.messages?.length > 0).length}

                            </Text>

                            <Text style={styles.chatStatLabel}>Active Chats</Text>

                        </View>

                    </View>

                );

            case 'resultsSummary':

                return (

                    <View style={styles.resultsSummary}>

                        <Text style={styles.resultsText}>

                            Showing {filteredChats.length} of {chats.length} chats

                        </Text>

                    </View>

                );

            case 'tableTitle':

                return (

                    <View style={styles.card}>

                        <Text style={styles.cardTitle}>Customer Conversations ({filteredChats.length})</Text>

                        <Text style={styles.cardSubtitle}>Tap on a chat to view and respond to messages</Text>

                    </View>

                );

            case 'loading':

                return (

                    <View style={[styles.loadingContainer, { marginHorizontal: 15 }]}>

                        <ActivityIndicator size="large" color="#007bff" />

                        <Text style={styles.loadingText}>Loading chats...</Text>

                    </View>

                );

            case 'chat':

                const index = filteredChats.findIndex(c => c._id === item.item._id);

                return (

                    <View style={{ marginHorizontal: 15 }}>

                        {renderChatItem({ item: item.item, index })}

                    </View>

                );

            case 'emptyState':

                return (

                    <View style={[styles.emptyState, { marginHorizontal: 15 }]}>

                        <Icon name="chat-bubble-outline" size={48} color="#6c757d" />

                        <Text style={styles.emptyStateText}>No chats found</Text>

                        <Text style={styles.emptyStateSubtext}>

                            Customer conversations will appear here

                        </Text>

                    </View>

                );

            default:

                return null;

        }

    };



    return (

        <View style={{ flex: 1 }}>

            <FlatList

                data={renderChatContent()}

                renderItem={renderChatTabItem}

                keyExtractor={(item) => item.key}

                contentContainerStyle={{ padding: 15 }}

                showsVerticalScrollIndicator={false}

            />

            <ChatModal

                isVisible={showChatModal}

                onClose={closeChatModal}

                chat={selectedChat}

                getAuthToken={getAuthToken}

            />

        </View>

    );

};



const AdminPage = () => {

    const router = useRouter();

    const [activeTab, setActiveTab] = useState("dashboard");

    const [loading, setLoading] = useState(true);

    const [dashboardData, setDashboardData] = useState({
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: 0,
        pendingOrders: 0,
        processingOrders: 0,
        deliveredOrders: 0,
        lowStockProducts: 0
    });

    const [allOrders, setAllOrders] = useState([]);

    const [allProducts, setAllProducts] = useState([]);

    const [allUsers, setAllUsers] = useState([]);

    const [categories, setCategories] = useState([]);

    const [furnitureTypes, setFurnitureTypes] = useState([]);







    const getAuthToken = async () => AsyncStorage.getItem('token');

    // Helper function to get consistent order amount
    const getOrderAmount = (order) => {
        return order.totalAmount || order.amount || 0;
    };

    const fetchAllAdminData = async () => {

        setLoading(true);

        try {

            const token = await getAuthToken();

            if (!token) {

                router.push("/Login");

                return;

            }

            const headers = { 'Authorization': `Bearer ${token}` };



            const [ordersRes, usersRes, productsRes, catsRes, typesRes] = await Promise.all([

                fetch(`${API_BASE_URL}/api/orders`, { headers }),

                fetch(`${API_BASE_URL}/api/allusers`, { headers }),

                fetch(`${API_BASE_URL}/api/items`),

                fetch(`${API_BASE_URL}/api/categories`),

                fetch(`${API_BASE_URL}/api/furnituretypes`)

            ]);



            const ordersPayload = await ordersRes.json();

            const usersPayload = await usersRes.json();

            const productsPayload = await productsRes.json();

            const catsPayload = await catsRes.json();

            const typesPayload = await typesRes.json();



            const ordersData = ordersPayload.OrderData || [];

            const usersData = usersPayload.UserData || [];

            const productsData = productsPayload.ItemData || [];



            setAllOrders(ordersData);

            setAllUsers(usersData);

            setAllProducts(productsData);

            setCategories(catsPayload.CategoryData || []);

            setFurnitureTypes(typesPayload.FurnitureTypeData || []);



            // Enhanced sales calculation - include all revenue-generating orders
            const revenueGeneratingStatuses = ['On Process', 'Delivered', 'Picked Up', 'Ready for Pickup', 'Ready For Delivery'];
            const totalSales = ordersData
                .filter(order => revenueGeneratingStatuses.includes(order.status))
                .reduce((sum, order) => sum + getOrderAmount(order), 0);

            // Additional stats for better dashboard insights
            const pendingOrders = ordersData.filter(o => o.status === 'Pending').length;
            const processingOrders = ordersData.filter(o => o.status === 'On Process').length;
            const deliveredOrders = ordersData.filter(o => o.status === 'Delivered').length;
            const lowStockProducts = productsData.filter(p => p.stock < 5).length;

            setDashboardData({

                totalSales,

                totalOrders: ordersData.length,

                totalCustomers: usersData.filter(u => u.isActive !== false).length,

                totalProducts: productsData.filter(p => p.isActive !== false).length,

                pendingOrders,

                processingOrders,

                deliveredOrders,

                lowStockProducts,

            });



        } catch (error) {

            console.error("Error fetching admin data:", error);

            Alert.alert("Network Error", "Failed to fetch dashboard data.");

        } finally {

            setLoading(false);

        }

    };



    const updateOrderStatus = async (orderId, newStatus, remarks = '') => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {

                method: 'PUT',

                headers: {

                    'Content-Type': 'application/json',

                    'Authorization': `Bearer ${token}`,

                },

                body: JSON.stringify({ status: newStatus, remarks })

            });



            const data = await response.json();



            if (response.ok && data.success) {

                setAllOrders(prev => prev.map(order =>

                    order._id === orderId ? { ...order, status: newStatus, remarks } : order

                ));





            } else {

                Alert.alert('Error', data.message || 'Failed to update order status');

            }

        } catch (error) {

            console.error('Error updating order status:', error);

            Alert.alert('Network Error', 'Unable to update order status');

        }

    };



    const createProduct = async (productData) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const isFormData = productData instanceof FormData;

            const headers = { 'Authorization': `Bearer ${token}` };



            if (!isFormData) {

                headers['Content-Type'] = 'application/json';

            }



            const response = await fetch(`${API_BASE_URL}/api/items`, {

                method: 'POST',

                headers,

                body: isFormData ? productData : JSON.stringify(productData)

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Product created successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to create product');

            }

        } catch (error) {

            console.error('Error creating product:', error);

            Alert.alert('Network Error', 'Unable to create product');

        }

    };



    const updateProduct = async (productId, productData) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const isFormData = productData instanceof FormData;

            const headers = { 'Authorization': `Bearer ${token}` };



            if (!isFormData) {

                headers['Content-Type'] = 'application/json';

            }



            const response = await fetch(`${API_BASE_URL}/api/items/${productId}`, {

                method: 'PUT',

                headers,

                body: isFormData ? productData : JSON.stringify(productData)

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Product updated successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to update product');

            }

        } catch (error) {

            console.error('Error updating product:', error);

            Alert.alert('Network Error', 'Unable to update product');

        }

    };



    const deleteProduct = async (productId) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/items/${productId}`, {

                method: 'DELETE',

                headers: { 'Authorization': `Bearer ${token}` }

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Product deleted successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to delete product');

            }

        } catch (error) {

            console.error('Error deleting product:', error);

            Alert.alert('Network Error', 'Unable to delete product');

        }

    };



    const createCustomer = async (customerData) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/registeruser`, {

                method: 'POST',

                headers: {

                    'Content-Type': 'application/json',

                    'Authorization': `Bearer ${token}`,

                },

                body: JSON.stringify(customerData)

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Customer created successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to create customer');

            }

        } catch (error) {

            console.error('Error creating customer:', error);

            Alert.alert('Network Error', 'Unable to create customer');

        }

    };



    const updateCustomer = async (customerId, customerData) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/users/${customerId}`, {

                method: 'PUT',

                headers: {

                    'Content-Type': 'application/json',

                    'Authorization': `Bearer ${token}`,

                },

                body: JSON.stringify(customerData)

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Customer updated successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to update customer');

            }

        } catch (error) {

            console.error('Error updating customer:', error);

            Alert.alert('Network Error', 'Unable to update customer');

        }

    };



    const deactivateCustomer = async (customerId) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/users/${customerId}/deactivate`, {

                method: 'PUT',

                headers: {

                    'Content-Type': 'application/json',

                    'Authorization': `Bearer ${token}`,

                },

                body: JSON.stringify({})

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Customer deactivated successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to deactivate customer');

            }

        } catch (error) {

            console.error('Error deactivating customer:', error);

            Alert.alert('Network Error', 'Unable to deactivate customer');

        }

    };



    const createCategory = async (categoryData) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/categories`, {

                method: 'POST',

                headers: {

                    'Content-Type': 'application/json',

                    'Authorization': `Bearer ${token}`,

                },

                body: JSON.stringify(categoryData)

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Category created successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to create category');

            }

        } catch (error) {

            console.error('Error creating category:', error);

            Alert.alert('Network Error', 'Unable to create category');

        }

    };



    const updateCategory = async (categoryId, categoryData) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {

                method: 'PUT',

                headers: {

                    'Content-Type': 'application/json',

                    'Authorization': `Bearer ${token}`,

                },

                body: JSON.stringify(categoryData)

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Category updated successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to update category');

            }

        } catch (error) {

            console.error('Error updating category:', error);

            Alert.alert('Network Error', 'Unable to update category');

        }

    };



    const deleteCategory = async (categoryId) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {

                method: 'DELETE',

                headers: { 'Authorization': `Bearer ${token}` }

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Category deleted successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to delete category');

            }

        } catch (error) {

            console.error('Error deleting category:', error);

            Alert.alert('Network Error', 'Unable to delete category');

        }

    };



    const createFurnitureType = async (furnitureTypeData) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/furnituretypes`, {

                method: 'POST',

                headers: {

                    'Content-Type': 'application/json',

                    'Authorization': `Bearer ${token}`,

                },

                body: JSON.stringify(furnitureTypeData)

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Furniture type created successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to create furniture type');

            }

        } catch (error) {

            console.error('Error creating furniture type:', error);

            Alert.alert('Network Error', 'Unable to create furniture type');

        }

    };



    const updateFurnitureType = async (furnitureTypeId, furnitureTypeData) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            // Determine the correct endpoint and request options

            let endpoint = `${API_BASE_URL}/api/furnituretypes/${furnitureTypeId}`;

            let options = {

                method: 'PUT',

                headers: {

                    'Authorization': `Bearer ${token}`,

                },

            };



            // If we are only toggling the status (activate), use the dedicated endpoint

            if (Object.keys(furnitureTypeData).length === 1 && 'status' in furnitureTypeData) {

                endpoint = `${API_BASE_URL}/api/furnituretypes/${furnitureTypeId}/activate`;

                // No body is required for activation

            } else {

                // Otherwise we are updating the furniture type name (or other fields)

                options.headers['Content-Type'] = 'application/json';

                options.body = JSON.stringify(furnitureTypeData);

            }



            const response = await fetch(endpoint, options);



            // Safely attempt to parse JSON only if the response body exists and is JSON

            let data = {};

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {

                data = await response.json();

            }



            if (response.ok && (data.success || Object.keys(furnitureTypeData).length === 1 && 'status' in furnitureTypeData)) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Furniture type updated successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to update furniture type');

            }

        } catch (error) {

            console.error('Error updating furniture type:', error);

            Alert.alert('Network Error', 'Unable to update furniture type');

        }

    };



    const deleteFurnitureType = async (furnitureTypeId) => {

        try {

            const token = await getAuthToken();

            if (!token) return;



            const response = await fetch(`${API_BASE_URL}/api/furnituretypes/${furnitureTypeId}`, {

                method: 'DELETE',

                headers: { 'Authorization': `Bearer ${token}` }

            });



            const data = await response.json();



            if (response.ok && data.success) {

                await fetchAllAdminData();

                Alert.alert('Success', 'Furniture type deleted successfully');

            } else {

                Alert.alert('Error', data.message || 'Failed to delete furniture type');

            }

        } catch (error) {

            console.error('Error deleting furniture type:', error);

            Alert.alert('Network Error', 'Unable to delete furniture type');

        }

    };



    useEffect(() => {

        fetchAllAdminData();

    }, []);



    const navItems = [
        { id: "dashboard", icon: "dashboard", label: "Dashboard" },
        { id: "analytics", icon: "analytics", label: "Analytics" },
        { id: "orders", icon: "receipt-long", label: "Orders" },
        { id: "custom-orders", icon: "build", label: "Custom Orders" },
        { id: "products", icon: "inventory-2", label: "Products" },
        { id: "customers", icon: "people", label: "Customers" },
        { id: "settings", icon: "settings", label: "Settings" },
        { id: "chat", icon: "chat", label: "Chat" },
        { id: "logs", icon: "history", label: "Logs" },
    ];



    const logout = () => {

        Alert.alert("Logout", "Are you sure you want to logout?", [

            { text: "Cancel", style: "cancel" },

            {

                text: "Logout",

                style: "destructive",

                onPress: async () => {

                    await AsyncStorage.multiRemove(['token', 'userId', 'userRole']);

                    setActiveTab("dashboard");

                    router.push("/Login");

                }

            }

        ]);

    };



    if (loading) {

        return (

            <SafeAreaView style={styles.loadingContainer}>

                <ActivityIndicator size="large" color="#007bff" />

                <Text style={{ marginTop: 10, color: '#6c757d' }}>Loading Admin Panel...</Text>

            </SafeAreaView>

        );

    }



    return (

        <SafeAreaView style={styles.container}>

            <View style={styles.header}>

                <Text style={styles.headerTitle}>Admin Panel</Text>

                <TouchableOpacity onPress={logout}>

                    <Icon name="logout" size={24} color="#343a40" />

                </TouchableOpacity>

            </View>



            <View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navContainer}>

                    {navItems.map((item) => (

                        <TouchableOpacity

                            key={item.id}

                            style={[styles.navItem, activeTab === item.id && styles.navItemActive]}

                            onPress={() => setActiveTab(item.id)}

                        >

                            <Icon name={item.icon} size={20} color={activeTab === item.id ? "#007bff" : "#6c757d"} />

                            <Text style={[styles.navItemText, activeTab === item.id && styles.navItemTextActive]}>{item.label}</Text>

                        </TouchableOpacity>

                    ))}

                </ScrollView>

            </View>



            <View style={styles.contentArea}>

                {activeTab === 'dashboard' && <DashboardTab stats={dashboardData} recentOrders={allOrders.slice(0, 5)} />}

                {activeTab === 'analytics' && <AnalyticsTab orders={allOrders} products={allProducts} />}

                {activeTab === 'orders' && <OrdersTab orders={allOrders} onUpdateOrderStatus={updateOrderStatus} API_BASE_URL={API_BASE_URL} />}

                {activeTab === 'custom-orders' && <CustomOrdersTab orders={allOrders} onUpdateOrderStatus={updateOrderStatus} API_BASE_URL={API_BASE_URL} />}

                {activeTab === 'products' && <ProductsTab products={allProducts} categories={categories} furnitureTypes={furnitureTypes} onProductUpdate={updateProduct} onProductDelete={deleteProduct} onProductCreate={createProduct} API_BASE_URL={API_BASE_URL} />}

                {activeTab === 'customers' && <CustomersTab customers={allUsers} onCustomerUpdate={updateCustomer} onCustomerDelete={deactivateCustomer} onCustomerCreate={createCustomer} API_BASE_URL={API_BASE_URL} />}

                {activeTab === 'settings' && <SettingsTab categories={categories} furnitureTypes={furnitureTypes} onCategoryCreate={createCategory} onCategoryUpdate={updateCategory} onCategoryDelete={deleteCategory} onFurnitureTypeCreate={createFurnitureType} onFurnitureTypeUpdate={updateFurnitureType} onFurnitureTypeDelete={deleteFurnitureType} API_BASE_URL={API_BASE_URL} />}

                {activeTab === 'chat' && <AdminChatTab API_BASE_URL={API_BASE_URL} />}

                {activeTab === 'logs' && <LogsTab API_BASE_URL={API_BASE_URL} getAuthToken={getAuthToken} />}

            </View>

        </SafeAreaView>

    );

};



const styles = StyleSheet.create({

    container: { flex: 1, backgroundColor: '#f8f9fa' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {

        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',

        paddingHorizontal: 20, paddingVertical: 15,

        backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#dee2e6',

    },

    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#343a40' },

    navContainer: { padding: 10, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },

    navItem: {

        flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15,

        borderRadius: 20, marginHorizontal: 5, backgroundColor: '#f8f9fa'

    },

    navItemActive: { backgroundColor: '#e7f3ff' },

    navItemText: { marginLeft: 8, fontSize: 16, color: '#6c757d', fontWeight: '500' },

    navItemTextActive: { color: '#007bff', fontWeight: 'bold' },

    contentArea: { flex: 1 },

    pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#343a40', marginBottom: 20, paddingHorizontal: 15 },

    statsGrid: {

        flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',

    },

    statCard: {

        width: '48%', backgroundColor: '#ffffff', padding: 20, borderRadius: 12,

        marginBottom: 15, alignItems: 'flex-start',

        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.05, shadowRadius: 5, elevation: 3,

    },

    statValue: { fontSize: 28, fontWeight: 'bold', color: '#212529', marginVertical: 8 },

    statLabel: { fontSize: 14, color: '#6c757d' },

    card: {

        backgroundColor: '#ffffff', borderRadius: 12, marginTop: 10, marginHorizontal: 15,

        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.05, shadowRadius: 5, elevation: 3,

    },

    cardTitle: { fontSize: 20, fontWeight: 'bold', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },

    cardSubtitle: { fontSize: 12, color: '#6c757d', paddingHorizontal: 15, paddingBottom: 10 },

    tableHeader: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#f8f9fa' },

    tableHeaderCell: { color: '#6c757d', fontWeight: 'bold', fontSize: 12 },

    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', backgroundColor: '#ffffff' },

    tableRowAlt: { backgroundColor: '#f8f9fa' },

    tableCell: { fontSize: 14, color: '#495057' },

    statusBadge: {

        borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10,

        fontSize: 12, fontWeight: 'bold', overflow: 'hidden', textTransform: 'capitalize'

    },

    status_OnProcess: { backgroundColor: '#d1fae5', color: '#065f46' },

    status_Delivered: { backgroundColor: '#fef3c7', color: '#92400e' },

    status_RequestingforRefund: { backgroundColor: '#dbeafe', color: '#1e40af' },

    status_Refunded: { backgroundColor: '#e5e7eb', color: '#374151' },

    searchContainer: {

        flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',

        borderWidth: 1, borderColor: '#dee2e6', borderRadius: 12, marginBottom: 10,

        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },

        shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, marginHorizontal: 15, paddingHorizontal: 15

    },

    searchIcon: { marginRight: 10 },

    searchInput: { flex: 1, fontSize: 16, color: '#343a40', height: 50 },

    filtersContainer: {

        padding: 15, backgroundColor: '#ffffff', marginBottom: 10, marginHorizontal: 15,

        borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },

        shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,

    },

    filtersLabel: { fontSize: 16, fontWeight: 'bold', color: '#343a40', marginBottom: 10 },

    filtersScroll: { paddingVertical: 5 },

    filterChip: {

        paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: '#dee2e6',

        borderRadius: 20, marginRight: 8, backgroundColor: '#f8f9fa', textTransform: 'capitalize'

    },

    filterChipActive: {

        backgroundColor: '#007bff', borderColor: '#007bff',

        shadowColor: '#007bff', shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,

    },

    filterChipText: { fontSize: 14, color: '#6c757d', fontWeight: '500', textTransform: 'capitalize' },

    filterChipTextActive: { color: '#ffffff', fontWeight: 'bold' },

    resultsSummary: {

        padding: 10, backgroundColor: '#ffffff', marginBottom: 10, marginHorizontal: 15,

        borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#007bff',

    },

    resultsText: { fontSize: 14, color: '#6c757d', fontWeight: '600' },

    emptyState: {

        padding: 40, justifyContent: 'center', alignItems: 'center',

        backgroundColor: '#ffffff', borderRadius: 12, margin: 15,

    },

    emptyStateText: { fontSize: 18, fontWeight: 'bold', color: '#343a40', marginTop: 10, marginBottom: 5 },

    emptyStateSubtext: { fontSize: 14, color: '#6c757d', textAlign: 'center' },

    modalOverlay: {

        flex: 1,

        justifyContent: 'center',

        alignItems: 'center',

        backgroundColor: 'rgba(0, 0, 0, 0.5)',

    },

    modalContent: {

        backgroundColor: 'white',

        borderRadius: 20,

        width: '90%',

        maxHeight: '85%',

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 10 },

        shadowOpacity: 0.25,

        shadowRadius: 20,

        elevation: 10,

    },

    modalHeader: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        padding: 20,

        borderBottomWidth: 1,

        borderBottomColor: '#f1f3f5',

    },

    modalTitle: {

        fontSize: 20,

        fontWeight: 'bold',

        color: '#343a40',

    },

    modalCloseButton: {

        padding: 5,

        borderRadius: 20,

        backgroundColor: '#f8f9fa',

    },

    modalBody: {

        paddingHorizontal: 20,

    },

    modalSection: {

        marginBottom: 25,

        paddingBottom: 15,

        borderBottomWidth: 1,

        borderBottomColor: '#f1f3f5',

    },

    modalSectionTitle: {

        fontSize: 16,

        fontWeight: 'bold',

        color: '#343a40',

        marginBottom: 12,

    },

    modalInfoRow: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        marginBottom: 8,

    },

    modalInfoLabel: {

        fontSize: 14,

        fontWeight: '600',

        color: '#6c757d',

        flex: 1,

    },

    modalInfoValue: {

        fontSize: 14,

        color: '#343a40',

        flex: 2,

        textAlign: 'right',

    },

    modalStatusContainer: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 8,

    },

    modalStatusButton: {

        padding: 8,

        borderRadius: 16,

        backgroundColor: '#f8f9fa',

        borderWidth: 1,

        borderColor: '#dee2e6',

    },

    modalOrderItem: {

        backgroundColor: '#f8f9fa',

        padding: 12,

        borderRadius: 8,

        marginBottom: 8,

    },

    modalOrderItemHeader: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        marginBottom: 6,

    },

    modalOrderItemName: {

        fontSize: 14,

        fontWeight: '600',

        color: '#343a40',

        flex: 2,

    },

    modalOrderItemPrice: {

        fontSize: 14,

        fontWeight: 'bold',

        color: '#007bff',

        flex: 1,

        textAlign: 'right',

    },

    modalOrderItemDetails: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

    },

    modalOrderItemQuantity: {

        fontSize: 12,

        color: '#6c757d',

    },

    modalOrderItemTotal: {

        fontSize: 12,

        fontWeight: '600',

        color: '#28a745',

    },

    modalSummaryRow: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        paddingTop: 10,

        borderTopWidth: 1,

        borderTopColor: '#dee2e6',

    },

    modalSummaryLabel: {

        fontSize: 16,

        fontWeight: 'bold',

        color: '#343a40',

    },

    modalSummaryValue: {

        fontSize: 18,

        fontWeight: 'bold',

        color: '#28a745',

    },

    modalAddressText: {

        fontSize: 14,

        color: '#343a40',

        lineHeight: 20,

        backgroundColor: '#f8f9fa',

        padding: 12,

        borderRadius: 8,

    },

    productName: {

        fontSize: 16,

        fontWeight: '600',

        color: '#343a40',

        marginBottom: 4,

    },

    productCategory: {

        fontSize: 14,

        color: '#6c757d',

    },

    productActions: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 8,

    },

    actionButton: {

        padding: 8,

        borderRadius: 16,

        backgroundColor: '#f8f9fa',

        borderWidth: 1,

        borderColor: '#dee2e6',

    },

    deleteButton: {

        backgroundColor: '#fee2e2',

        borderColor: '#fecaca',

    },

    inputLabel: {

        fontSize: 14,

        fontWeight: '600',

        color: '#495057',

        marginBottom: 6,

    },

    textInput: {

        borderWidth: 1,

        borderColor: '#dee2e6',

        borderRadius: 8,

        padding: 12,

        fontSize: 16,

        color: '#343a40',

        backgroundColor: '#ffffff',

        marginBottom: 16,

    },

    textArea: {

        height: 80,

        textAlignVertical: 'top',

    },

    row: {

        flexDirection: 'row',

        gap: 12,

    },

    halfWidth: {

        flex: 1,

    },

    thirdWidth: {

        flex: 1,

    },

    pickerContainer: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        borderWidth: 1,

        borderColor: '#dee2e6',

        borderRadius: 8,

        padding: 12,

        backgroundColor: '#f8f9fa',

        marginBottom: 16,

    },

    pickerText: {

        fontSize: 16,

        color: '#343a40',

    },

    categoryChips: {

        marginBottom: 16,

    },

    categoryChip: {

        paddingHorizontal: 12,

        paddingVertical: 6,

        borderWidth: 1,

        borderColor: '#dee2e6',

        borderRadius: 16,

        marginRight: 8,

        backgroundColor: '#ffffff',

    },

    categoryChipActive: {

        backgroundColor: '#007bff',

        borderColor: '#007bff',

    },

    categoryChipText: {

        fontSize: 14,

        color: '#495057',

    },

    categoryChipTextActive: {

        color: '#ffffff',

        fontWeight: '600',

    },

    checkboxRow: {

        flexDirection: 'row',

        alignItems: 'center',

        marginBottom: 12,

    },

    checkbox: {

        marginRight: 8,

    },

    checkboxLabel: {

        fontSize: 16,

        color: '#495057',

    },

    modalFooter: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        padding: 20,

        borderTopWidth: 1,

        borderTopColor: '#f1f3f5',

    },

    cancelButton: {

        flex: 1,

        padding: 12,

        borderWidth: 1,

        borderColor: '#dee2e6',

        borderRadius: 8,

        backgroundColor: '#f8f9fa',

        marginRight: 8,

        alignItems: 'center',

    },

    cancelButtonText: {

        fontSize: 16,

        fontWeight: '600',

        color: '#495057',

    },

    saveButton: {

        flex: 1,

        padding: 12,

        borderWidth: 1,

        borderColor: '#007bff',

        borderRadius: 8,

        backgroundColor: '#007bff',

        marginLeft: 8,

        alignItems: 'center',

    },

    saveButtonText: {

        fontSize: 16,

        fontWeight: '600',

        color: '#ffffff',

    },

    addButton: {

        flexDirection: 'row',

        alignItems: 'center',

        justifyContent: 'center',

        padding: 12,

        backgroundColor: '#007bff',

        borderRadius: 8,

        marginBottom: 15,

        marginHorizontal: 15,

        shadowColor: '#007bff',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.2,

        shadowRadius: 4,

        elevation: 3,

    },

    addButtonText: {

        fontSize: 16,

        fontWeight: '600',

        color: '#ffffff',

        marginLeft: 8,

    },

    customerName: {

        fontSize: 16,

        fontWeight: '600',

        color: '#343a40',

        marginBottom: 4,

    },

    customerEmail: {

        fontSize: 14,

        color: '#6c757d',

    },

    customerActions: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 8,

    },

    roleButton: {

        paddingHorizontal: 8,

        paddingVertical: 4,

        borderRadius: 12,

        borderWidth: 1,

    },

    userRole: {

        backgroundColor: '#e3f2fd',

        borderColor: '#2196f3',

    },

    adminRole: {

        backgroundColor: '#fff3e0',

        borderColor: '#ff9800',

    },

    roleText: {

        fontSize: 12,

        fontWeight: '600', textTransform: 'capitalize'

    },

    userRoleText: {

        color: '#1976d2',

    },

    adminRoleText: {

        color: '#f57c00',

    },

    roleSelectionContainer: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 16,

        marginBottom: 16,

    },

    roleOption: {

        flexDirection: 'row',

        alignItems: 'center',

        padding: 12,

        borderWidth: 1,

        borderColor: '#dee2e6',

        borderRadius: 8,

        backgroundColor: '#f8f9fa',

        flex: 1,

    },

    roleOptionActive: {

        backgroundColor: '#e7f3ff',

        borderColor: '#007bff',

    },

    roleOptionText: {

        fontSize: 16,

        color: '#495057',

        marginLeft: 8,

    },

    roleOptionTextActive: {

        color: '#007bff',

        fontWeight: '600',

    },

    infoBox: {

        flexDirection: 'row',

        alignItems: 'flex-start',

        gap: 8,

        padding: 12,

        backgroundColor: '#e7f3ff',

        borderRadius: 8,

        borderLeftWidth: 4,

        borderLeftColor: '#007bff',

    },

    infoText: {

        fontSize: 14,

        color: '#495057',

        flex: 1,

        lineHeight: 20,

    },

    dropdownContainer: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        borderWidth: 1,

        borderColor: '#dee2e6',

        borderRadius: 8,

        padding: 12,

        backgroundColor: '#ffffff',

        marginBottom: 16,

    },

    dropdownText: {

        fontSize: 16,

        color: '#343a40',

    },

    dropdownDisabled: {

        backgroundColor: '#f8f9fa',

        borderColor: '#dee2e6',

    },

    dropdownTextDisabled: {

        color: '#6c757d',

    },

    settingsNav: {

        flexDirection: 'row',

        justifyContent: 'space-around',

        alignItems: 'center',

        padding: 10,

        backgroundColor: '#ffffff',

        borderBottomWidth: 1,

        borderBottomColor: '#dee2e6',

        marginHorizontal: 15,

        borderRadius: 12,

        marginBottom: 15

    },

    settingsNavItem: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 8,

        paddingVertical: 10,

        paddingHorizontal: 20,

        borderRadius: 16,

        backgroundColor: '#f8f9fa',

    },

    settingsNavItemActive: {

        backgroundColor: '#e7f3ff',

    },

    settingsNavText: {

        fontSize: 16,

        color: '#6c757d',

    },

    settingsNavTextActive: {

        color: '#007bff',

        fontWeight: 'bold',

    },

    settingsHeader: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        marginBottom: 20,

        marginHorizontal: 15

    },

    settingsTitle: {

        fontSize: 20,

        fontWeight: 'bold',

        color: '#343a40',

    },

    settingsSubtitle: {

        fontSize: 14,

        color: '#6c757d',

    },

    emptySettingsState: {

        padding: 40,

        justifyContent: 'center',

        alignItems: 'center',

        backgroundColor: '#ffffff',

        borderRadius: 12,

        margin: 15,

    },

    settingsRow: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        padding: 15,

        borderBottomWidth: 1,

        borderBottomColor: '#f1f3f5',

        backgroundColor: '#ffffff'

    },

    settingsItemInfo: {

        flex: 1,

    },

    settingsItemName: {

        fontSize: 16,

        fontWeight: '600',

        color: '#343a40',

    },

    settingsItemDate: {

        fontSize: 14,

        color: '#6c757d',

    },

    settingsActions: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 10,

    },

    settingsActionButton: {

        padding: 8,

        borderRadius: 16,

        backgroundColor: '#f8f9fa',

        borderWidth: 1,

        borderColor: '#dee2e6',

    },

    deleteActionButton: {

        backgroundColor: '#fee2e2',

        borderColor: '#fecaca',

    },

    settingsModalContent: {

        backgroundColor: 'white',

        borderRadius: 20,

        width: '85%',

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 10 },

        shadowOpacity: 0.25,

        shadowRadius: 20,

        elevation: 10,

    },

    chatStats: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        marginBottom: 15,

        marginHorizontal: 10

    },

    chatStatCard: {

        flex: 1,

        backgroundColor: '#ffffff',

        padding: 15,

        borderRadius: 12,

        marginHorizontal: 5,

        alignItems: 'center',

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 2 },

        shadowOpacity: 0.05,

        shadowRadius: 5,

        elevation: 3,

    },

    chatStatValue: {

        fontSize: 20,

        fontWeight: 'bold',

        color: '#343a40',

        marginVertical: 5,

    },

    chatStatLabel: {

        fontSize: 12,

        color: '#6c757d',

        textAlign: 'center',

    },

    chatRow: {

        flexDirection: 'row',

        alignItems: 'center',

        padding: 15,

        borderBottomWidth: 1,

        borderBottomColor: '#f1f3f5',

        backgroundColor: '#ffffff'

    },

    chatRowAlt: {

        backgroundColor: '#f8f9fa',

    },

    chatAvatar: {

        width: 50,

        height: 50,

        borderRadius: 25,

        backgroundColor: '#e7f3ff',

        justifyContent: 'center',

        alignItems: 'center',

        marginRight: 15,

    },

    chatInfo: {

        flex: 1,

    },

    chatHeader: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        marginBottom: 4,

    },

    lastMessage: {

        fontSize: 14,

        color: '#6c757d',

        marginBottom: 4,

    },

    chatTime: {

        fontSize: 12,

        color: '#9ca3af',

    },

    chatActions: {

        alignItems: 'center',

        flexDirection: 'row',

        gap: 8,

    },

    messageCount: {

        backgroundColor: '#007bff',

        borderRadius: 12,

        paddingHorizontal: 8,

        paddingVertical: 4,

        minWidth: 24,

        alignItems: 'center',

    },

    messageCountText: {

        color: '#ffffff',

        fontSize: 12,

        fontWeight: 'bold',

    },

    chatModalContainer: {

        flex: 1,

        backgroundColor: '#f8f9fa',

    },

    chatModalHeader: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        padding: 15,

        backgroundColor: '#ffffff',

        borderBottomWidth: 1,

        borderBottomColor: '#dee2e6',

    },

    chatCustomerInfo: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 12,

    },

    chatCustomerDetails: {

        flex: 1,

    },

    chatCustomerEmail: {

        fontSize: 14,

        color: '#6c757d',

        marginTop: 2,

    },

    chatMessagesContainer: {

        flex: 1,

        paddingHorizontal: 15,

    },

    messagesContent: {

        paddingVertical: 15,

    },

    messageContainer: {

        marginBottom: 12,

        maxWidth: '80%',

        padding: 12,

        borderRadius: 16,

    },

    messageHeader: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        marginBottom: 4,

    },

    messageSender: {

        fontSize: 12,

        fontWeight: 'bold',

        color: '#495057',

    },

    messageTime: {

        fontSize: 10,

        color: '#9ca3af',

    },

    messageText: {

        fontSize: 16,

        color: '#343a40',

        lineHeight: 20,

    },

    adminMessage: {

        backgroundColor: '#007bff',

        alignSelf: 'flex-end',

        borderBottomRightRadius: 4,

    },

    userMessage: {

        backgroundColor: '#ffffff',

        alignSelf: 'flex-start',

        borderBottomLeftRadius: 4,

        borderWidth: 1,

        borderColor: '#f1f3f5'

    },

    emptyChat: {

        flex: 1,

        justifyContent: 'center',

        alignItems: 'center',

        padding: 40,

    },

    emptyChatText: {

        fontSize: 18,

        fontWeight: 'bold',

        color: '#343a40',

        marginTop: 10,

        marginBottom: 5,

    },

    emptyChatSubtext: {

        fontSize: 14,

        color: '#6c757d',

        textAlign: 'center',

    },

    chatInputContainer: {

        flexDirection: 'row',

        alignItems: 'flex-end',

        padding: 15,

        borderTopWidth: 1,

        borderTopColor: '#f1f3f5',

        backgroundColor: '#ffffff',

    },

    chatInput: {

        flex: 1,

        borderWidth: 1,

        borderColor: '#dee2e6',

        borderRadius: 20,

        paddingHorizontal: 15,

        paddingVertical: 10,

        fontSize: 16,

        maxHeight: 100,

        marginRight: 10,

    },

    chatSendButton: {

        backgroundColor: '#007bff',

        borderRadius: 20,

        width: 40,

        height: 40,

        justifyContent: 'center',

        alignItems: 'center',

    },

    chatSendButtonDisabled: {

        backgroundColor: '#9ca3af',

    },

    loadingText: {

        marginTop: 10,

        fontSize: 16,

        color: '#6c757d',

    },

    imageUploadButton: {

        flexDirection: 'row',

        alignItems: 'center',

        justifyContent: 'center',

        padding: 15,

        borderWidth: 2,

        borderColor: '#007bff',

        borderStyle: 'dashed',

        borderRadius: 8,

        backgroundColor: '#f8f9fa',

        marginBottom: 8,

    },

    imageUploadText: {

        marginLeft: 8,

        fontSize: 16,

        color: '#007bff',

        fontWeight: '500',

    },

    helperText: {

        fontSize: 12,

        color: '#6c757d',

        fontStyle: 'italic',

        marginBottom: 16

    },

    materialRow: {

        flexDirection: 'row',

        alignItems: 'flex-end',

        marginBottom: 12,

        padding: 12,

        backgroundColor: '#f8f9fa',

        borderRadius: 8,

        gap: 8

    },

    materialInputContainer: {

        flex: 1,

    },

    materialLabel: {

        fontSize: 12,

        fontWeight: '600',

        color: '#495057',

        marginBottom: 4,

    },

    materialInput: {

        borderWidth: 1,

        borderColor: '#dee2e6',

        borderRadius: 6,

        padding: 8,

        fontSize: 14,

        backgroundColor: '#ffffff',

    },

    removeMaterialButton: {

        padding: 8,

        borderRadius: 6,

        backgroundColor: '#fee2e2',

        borderWidth: 1,

        borderColor: '#fecaca',

        alignItems: 'center',

        justifyContent: 'center',

    },

    addMaterialButton: {

        flexDirection: 'row',

        alignItems: 'center',

        justifyContent: 'center',

        padding: 12,

        backgroundColor: '#e7f3ff',

        borderRadius: 8,

        borderWidth: 1,

        borderColor: '#b3d9ff',

        marginTop: 8,

    },

    addMaterialText: {

        marginLeft: 8,

        fontSize: 14,

        color: '#007bff',

        fontWeight: '600',

    },

    imagePreviewContainer: {

        marginTop: 12,

    },

    imagePreviewScroll: {

        marginTop: 8,

    },

    imagePreviewItem: {

        position: 'relative',

        marginRight: 12,

    },

    imagePreview: {

        width: 80,

        height: 80,

        borderRadius: 8,

        backgroundColor: '#f8f9fa',

    },

    removeImageButton: {

        position: 'absolute',

        top: -8,

        right: -8,

        backgroundColor: '#dc3545',

        borderRadius: 12,

        width: 24,

        height: 24,

        justifyContent: 'center',

        alignItems: 'center',

        borderWidth: 2,

        borderColor: '#ffffff',

    },

    orderActionContainer: {

        flexDirection: 'row',

        alignItems: 'center',

        gap: 8,

    },

    statusContainer: {

        flex: 1,

        alignItems: 'flex-end'

    },

    deliveryProofButton: {

        padding: 6,

        borderRadius: 12,

        backgroundColor: '#d4edda',

        borderWidth: 1,

        borderColor: '#c3e6cb',

    },

    orderSummaryContainer: {

        backgroundColor: '#f8f9fa',

        padding: 15,

        borderRadius: 8,

        marginBottom: 20,

    },

    orderSummaryTitle: {

        fontSize: 16,

        fontWeight: 'bold',

        color: '#343a40',

        marginBottom: 8,

    },

    orderSummaryText: {

        fontSize: 14,

        color: '#495057',

        marginBottom: 4,

    },

    deliveryProofPreview: {

        width: '100%',

        height: 200,

        borderRadius: 8,

        backgroundColor: '#f8f9fa',

        marginTop: 8,

    },

    saveButtonDisabled: {

        backgroundColor: '#9ca3af',

        borderColor: '#9ca3af',

    },

    imageUploadButtonSelected: {

        backgroundColor: '#f0f9ff',

        borderColor: '#28a745',

        borderWidth: 2,

    },

    imageUploadTextSelected: {

        color: '#28a745',

        fontWeight: 'bold',

    },

    logItem: {

        backgroundColor: '#ffffff',

        borderRadius: 12,

        padding: 15,

        marginBottom: 10,

        borderWidth: 1,

        borderColor: '#dee2e6',

    },

    logItemAlt: {

        backgroundColor: '#f8f9fa',

    },

    logHeader: {

        flexDirection: 'row',

        justifyContent: 'space-between',

        alignItems: 'center',

        marginBottom: 10,

        borderBottomWidth: 1,

        borderBottomColor: '#f1f3f5',

        paddingBottom: 10,

    },

    logAction: {

        fontSize: 14,

        fontWeight: 'bold',

        color: '#007bff',

        flex: 1,

    },

    logTimestamp: {

        fontSize: 12,

        color: '#6c757d',

    },

    logBody: {},

    logText: {

        fontSize: 14,

        lineHeight: 20,

        color: '#495057',

        marginBottom: 10,

    },

    logUser: {

        fontWeight: 'bold',

        color: '#343a40',

    },

    logEntityId: {

        fontFamily: 'monospace',

        backgroundColor: '#e9ecef',

        paddingHorizontal: 4,

        borderRadius: 4,

        color: '#495057'

    },

    logDetails: {

        backgroundColor: '#f8f9fa',

        borderRadius: 8,

        padding: 10,

    },

    logDetailsTitle: {

        fontSize: 12,

        fontWeight: 'bold',

        color: '#6c757d',

        marginBottom: 5,

    },

    logDetailsContent: {

        fontFamily: 'monospace',

        fontSize: 12,

        color: '#343a40',

    },

    retryButton: {

        marginTop: 20,

        backgroundColor: '#007bff',

        paddingVertical: 10,

        paddingHorizontal: 20,

        borderRadius: 8,

    },

    retryButtonText: {

        color: '#ffffff',

        fontSize: 16,

        fontWeight: 'bold',

    },

    statusCheckboxContainer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4 },
    statusCheckboxItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 4 },
    statusCheckboxLabel: { marginLeft: 4, fontSize: 12, color: '#343a40', textTransform: 'capitalize' },

    remarksContainer: { width: '100%', marginTop: 10, paddingHorizontal: 20 },
    remarksLabel: { fontSize: 14, fontWeight: '600', color: '#343a40', marginBottom: 4 },
    remarksInput: {
        borderWidth: 1,
        borderColor: '#dee2e6',
        borderRadius: 8,
        padding: 8,
        minHeight: 60,
        textAlignVertical: 'top',
        backgroundColor: '#fff'
    },
    remarksButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
    remarksButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, marginLeft: 8 },
    remarksCancelButton: { backgroundColor: '#e5e7eb' },
    remarksCancelButtonText: { color: '#374151', fontWeight: '600' },
    remarksSubmitButton: { backgroundColor: '#007bff' },
    remarksSubmitButtonText: { color: '#fff', fontWeight: '600' },

});



export default AdminPage;
