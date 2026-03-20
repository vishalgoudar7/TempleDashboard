import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../api/errors";
import { loginTempleOfficer } from "../api/templeOfficerApi";
import loginCscLogo from "../asset/logi csc.png";
import "../Styles/TempleOfficerLogin.css";

const SAVED_LOGIN_KEY = "templeOfficerSavedLogin";
const REMEMBER_ME_KEY = "templeOfficerRememberMe";

const getTempleName = (payload) =>
  payload?.temple_associated ||
  payload?.templeAssociated ||
  payload?.temple_name ||
  payload?.temple?.name ||
  payload?.["temple associated"] ||
  "";

const getTempleId = (payload) => {
  const candidateValues = [
    payload?.temple_id,
    payload?.templeId,
    payload?.associated_temple_id,
    payload?.associatedTempleId,
    payload?.temple?.temple_id,
    payload?.temple?.id,
    payload?.associated_temple?.temple_id,
    payload?.associated_temple?.id,
    payload?.["temple id"],
  ];

  for (const candidate of candidateValues) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim() !== "") {
      return String(candidate).trim();
    }
  }

  return "";
};

const TempleOfficerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_ME_KEY) === "1";
    if (!remembered) return;

    const savedLoginRaw = localStorage.getItem(SAVED_LOGIN_KEY);
    if (!savedLoginRaw) return;

    try {
      const savedLogin = JSON.parse(savedLoginRaw);
      setEmail(savedLogin?.username || savedLogin?.email || "");
      setPassword(savedLogin?.password || "");
      setRememberMe(true);
    } catch {
      localStorage.removeItem(SAVED_LOGIN_KEY);
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("templeOfficerToken");
    if (token) {
      navigate("/temple-officer/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginTempleOfficer({
        email: email.trim(),
        password,
      });
      const payload = response.data;

      const token =
        payload?.token ||
        payload?.auth_token ||
        payload?.key ||
        payload?.data?.token;

      if (!token) {
        throw new Error("Login succeeded but token is missing in API response.");
      }

      localStorage.setItem("templeOfficerToken", token);
      localStorage.setItem(
        "templeOfficerUser",
        JSON.stringify({
          message: payload?.message || "",
          token,
          userId: payload?.user_id || payload?.userId || "",
          username: payload?.username || payload?.email || email.trim(),
          email: payload?.email || email.trim(),
          templeName: getTempleName(payload),
          templeAssociated: getTempleName(payload),
          templeId: getTempleId(payload),
        })
      );

      localStorage.removeItem("firebaseIdToken");
      localStorage.removeItem("templeOfficerPhone");
      localStorage.removeItem("portalSessionAuth");

      if (rememberMe) {
        localStorage.setItem(
          SAVED_LOGIN_KEY,
          JSON.stringify({
            username: email.trim(),
            password,
          })
        );
        localStorage.setItem(REMEMBER_ME_KEY, "1");
      } else {
        localStorage.removeItem(SAVED_LOGIN_KEY);
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      navigate("/temple-officer/dashboard", {
        state: {
          loginMessage: payload?.message || "Login successful",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage(getApiErrorMessage(error, "Unable to login right now."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={loginCscLogo} alt="CSC Logo" className="login-logo" />
        <h2 className="login-title">Temple Officer Login</h2>

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            className="input-field text-input"
            placeholder="Email Address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <input
            type="password"
            className="input-field text-input"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Remember me</span>
          </label>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {errorMessage && <p className="error-text">{errorMessage}</p>}
      </div>
    </div>
  );
};

export default TempleOfficerLogin;
