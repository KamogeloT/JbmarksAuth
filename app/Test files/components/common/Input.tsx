import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Colors } from '@constants/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: object;
  inputContainerStyle?: object;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  containerStyle,
  inputContainerStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const textInputStyleArray: TextStyle[] = [styles.input];
  if (leftIcon) textInputStyleArray.push(styles.inputWithLeftIcon);
  if (rightIcon) textInputStyleArray.push(styles.inputWithRightIcon);
  if (style) textInputStyleArray.push(style as TextStyle);

  const inputContainerStyleArray: (ViewStyle | object)[] = [styles.inputContainer];
  if (isFocused) inputContainerStyleArray.push(styles.inputFocused);
  if (error) inputContainerStyleArray.push(styles.inputError);
  if (inputContainerStyle) inputContainerStyleArray.push(inputContainerStyle);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={inputContainerStyleArray}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={textInputStyleArray as any}
          placeholderTextColor={Colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    paddingLeft: 14,
  },
  rightIcon: {
    paddingRight: 14,
  },
  error: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
    marginLeft: 4,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 6,
    marginLeft: 4,
  },
});

export default Input;
