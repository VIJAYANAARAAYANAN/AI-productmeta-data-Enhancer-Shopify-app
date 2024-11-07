import React from "react";
import './ErrorPopup.css';

const ErrorPopup = ({ errorMessages, onClose }) => {
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      backgroundColor: "white", padding: "20px", boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.2)", borderRadius: "8px"
    }}>
      <h2 className="errorhead" >Validation Errors</h2>
      <ul>
        {errorMessages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
      <div className="closebtn">
      <button onClick={onClose} style={{ marginTop: "20px" }}>Close</button>
      </div>
    </div>
  );
};

export default ErrorPopup;
