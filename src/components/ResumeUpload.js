import React, { useState } from "react";

function ResumeUpload({ onResumeText }) {
    const [file, setFile] = useState(null);

    const handleFileChange = async (e) => {
        const uploadedFile = e.target.files[0];
        setFile(uploadedFile);


        const text = await uploadedFile.text();
        onResumeText(text);
    };

    return (
        <div>
            <input type="file" accept=".pdf,.txt,.doc,.docx" onChange={handleFileChange} />
        </div>
    );
}

export default ResumeUpload;