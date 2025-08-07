import React from 'react';
import './Header.css';

export default function Header({ unit, lesson, title }) {
  return (
    <div className="worksheet-header">
      <div className="header-left">
        Notes: U{unit}L{lesson} {title}
      </div>
      <div className="header-right">
        Name: ___________________ HR: _____
      </div>
    </div>
  );
}