import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDtv0fNj2JuvVppvCmyOvZGaqSn8-QPPsk",
  authDomain: "devotee-7c463.firebaseapp.com",
  projectId: "devotee-7c463",
  storageBucket: "devotee-7c463.appspot.com",
  messagingSenderId: "196593785407",
  appId: "1:196593785407:web:2ee5c24de0b8668a46368a",
  measurementId: "G-1NHD2B13X0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, auth, provider, db, RecaptchaVerifier, signInWithPhoneNumber };
