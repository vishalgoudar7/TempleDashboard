import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from "../firebase";
import "../Styles/PujariLogin.css";

const FALLBACK_LOGIN_TOKEN = "dd605c51b98bf8c0af4cd32c6a86a9ae56eea373";

const PujariLogin = () => {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const setupRecaptcha = async () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
      await window.recaptchaVerifier.render();
    }

    return window.recaptchaVerifier;
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const cleanedMobile = mobile.replace(/\D/g, "");
    if (cleanedMobile.length !== 10) {
      setErrorMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    setIsLoading(true);
    const phoneNumber = `+91${cleanedMobile}`;

    try {
      const appVerifier = await setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setShowOtp(true);
    } catch (error) {
      console.error("Error sending OTP:", error);
      setErrorMessage("Failed to send OTP. Check Firebase phone auth settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!confirmationResult) {
      setErrorMessage("Please request OTP first.");
      return;
    }

    if (otp.trim().length < 6) {
      setErrorMessage("Enter a valid 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await confirmationResult.confirm(otp.trim());
      const firebaseToken = await result.user.getIdToken();
      localStorage.setItem("pujariToken", FALLBACK_LOGIN_TOKEN);
      localStorage.setItem("firebaseIdToken", firebaseToken);
      localStorage.setItem("pujariPhone", result.user.phoneNumber || "");

      navigate("/pujari/dashboard");
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setErrorMessage(error.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Pujari Login</h2>

        {!showOtp ? (
          <form onSubmit={handleSendOtp}>
            <div className="phone-input-group">
              <span className="country-code">+91</span>
              <input
                type="tel"
                className="input-field"
                placeholder="Enter mobile number"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                maxLength={10}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <input
              type="text"
              className="input-field otp-input"
              placeholder="Enter OTP"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              maxLength={6}
              required
            />
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowOtp(false);
                setOtp("");
                setErrorMessage("");
              }}
              disabled={isLoading}
            >
              Change Number
            </button>
          </form>
        )}

        {errorMessage && <p className="error-text">{errorMessage}</p>}
      </div>

      <div id="recaptcha-container" />
    </div>
  );
};

export default PujariLogin;
