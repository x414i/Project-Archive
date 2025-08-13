import React from 'react';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { fullScreenPlugin } from '@react-pdf-viewer/full-screen';
import '../style/aboutcollege.css'; // Import custom styles
import pdffile from '../assets/files/CollegeRules.pdf';

const AboutCollege = () => {
    const zoom = zoomPlugin(); // Initialize the zoom plugin
    const fullScreen = fullScreenPlugin(); // Initialize the full-screen plugin
    const pdfUrl = `${pdffile}`; // Path to the PDF file

    return (
        <div className="about-college-container">
            <h1 className="about-college-title">اللائحة الرسمية للدراسة والامتحانات والتأديب بالكلية للدراسة الجامعية</h1>
            <p className="about-college-description">
يمكنك الاطلاع على اللائحة من خلال هذا الملف
            </p>
            <div className="about-college-pdf-viewer">
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <Viewer
                        fileUrl={pdfUrl}
                        plugins={[
                            zoom,
                            fullScreen, // Pass the plugins for zoom and full screen
                        ]}
                    />
                </Worker>
            </div>
        </div>
    );
};

export default AboutCollege;
