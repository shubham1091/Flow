import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import React, { useRef, useState } from "react";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import BackButton from "@/components/BackButton";
import Input from "@/components/Input";
import { At, Lock, User } from "phosphor-react-native";
import Button from "@/components/Button";
import { useRouter } from "expo-router";

const Register = () => {
    const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef("");
  const nameRef = useRef("");
  const passwordRef = useRef("");
  const router = useRouter();

  const handleSubmit = async () => {
    if(!emailRef.current || !passwordRef.current|| !nameRef.current) {
        Alert.alert("Sign Up", "Please fill all the fields")
        return;
    }
    console.log([emailRef.current, passwordRef.current, nameRef.current]);
  };
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <BackButton iconSize={28} />
        <View style={{ gap: 5, marginTop: spacingY._20 }}>
          <Typo
            size={30}
            fontWeight={"800"}
          >
            Let's
          </Typo>
          <Typo
            size={30}
            fontWeight={"800"}
          >
            Get Started
          </Typo>
        </View>
        <View style={styles.form}>
          <Typo
            size={16}
            color={colors.textLighter}
          >
            Create an account to track all your expenses
          </Typo>
          <Input
            placeholder="Enter your name"
            onChangeText={(value) => (nameRef.current = value)}
            icon={
              <User
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />
          <Input
            placeholder="Enter your email"
            onChangeText={(value) => (emailRef.current = value)}
            icon={
              <At
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />
          <Input
            placeholder="Enter your password"
            onChangeText={(value) => (passwordRef.current = value)}
            secureTextEntry
            icon={
              <Lock
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />
         
          <Button onPress={handleSubmit} loading={isLoading}>
            <Typo
              fontWeight={"700"}
              color={colors.black}
              size={21}
            >
              Sign Up
            </Typo>
          </Button>
        </View>
        <View style={styles.footer}>
            <Typo size={15}>Already have an account?</Typo>
            <Pressable onPress={() => router.push("/(auth)/login")}>
                <Typo size={15} fontWeight={"700"} color={colors.primary}>Log In</Typo>
            </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacingY._30,
    paddingHorizontal: spacingX._20,
  },
  welcomeText: {
    fontSize: verticalScale(20),
    fontWeight: "bold",
    color: colors.text,
  },
  form: {
    gap: spacingY._20,
  },
  forgotPassword: {
    textAlign: "right",
    fontWeight: "500",
    color: colors.text,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  footerText: {
    textAlign: "center",
    color: colors.text,
    fontSize: verticalScale(15),
  },
});
