// Loader.jsx
import React from 'react';
import { Modal, Spinner } from '@shopify/polaris';

const Loader = ({ isOpen, onClose }) => {
  return (
    <Modal open={isOpen} onClose={onClose} title="" primaryAction={null}>
      <Modal.Section>
        <div style={{ textAlign: "center" }}>
          <Spinner size="large" />
          <p>Loading, please wait...</p>
        </div>
      </Modal.Section>
    </Modal>
  );
};

export default Loader;
