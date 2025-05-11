import { createContext, ReactNode, FC, useState, useContext, useEffect } from "react";
import { auth, firestore } from "@/config/firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AuthContextType, UserType } from "@/types";
import { useRouter } from "expo-router";

const AuthContext = createContext<AuthContextType|null>(null);

export const AuthProvider:FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserType>(null);
  const router = useRouter();

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (user)=>{
      // console.log("user", user);
      if(user){
        setUser({uid: user.uid, email: user.email, name: user.displayName})
        updateUserData(user?.uid || "")
        router.replace("/(tabs)")
      }else{
        setUser(null)
        router.replace("/(auth)/welcome")
      }
    })
    
    return () => {
      unsub();
    }
  },[])

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error:any) {
      let msg= error.message;
      console.log("Error registering user:", msg);
      if (msg.includes("(auth/invalid-credential)")) msg = "Invalid credentials";
      if (msg.includes("(auth/invalid-email)")) msg = "Invalid email";
      return { success: false, msg: error.message };
    }
  };
  

  const register = async (email:string, password:string, name:string) => {
    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await setDoc(doc(firestore, "users", response?.user?.uid), {
        name,
        email,
        uid: response?.user?.uid,
      });
      return { success: true };
    } catch (error:any) {
      let msg= error.message;
      console.log("Error registering user:", msg);
      if (msg.includes("(auth/invalid-credential)")) msg = "Invalid credentials";
      if (msg.includes("(auth/invalid-email)")) msg = "Invalid email";
      return { success: false, msg };
    }
  };

  const updateUserData = async (userId:string) => {
    try {
      const docRef = doc(firestore, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Document data:", data);
        const userData: UserType= {
          uid: data.uid,
          email: data.email || null,
          name: data.name || null,
          image: data.image || null,
        };
        setUser({...userData});
      }
    } catch (error:any) {
      console.log("Error updating user data:", error.message);
    }
  };

  const contextValue= {
    user,
    setUser,
    login,
    register,
    updateUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = ():AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}