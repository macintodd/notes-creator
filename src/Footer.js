import React from 'react';
import './Footer.css';

export default function Footer({ title, isPage2 = false }) {
  return (
    <div className={`worksheet-footer ${isPage2 ? 'page-2' : ''}`}>
      <div className="footer-left">
        {title}
      </div>
      <div className="footer-center">
        {isPage2 ? 'Page 2' : 'Page 1'}
      </div>
      <div className="footer-right">
        Mr. Todd
      </div>
    </div>
  );
}
