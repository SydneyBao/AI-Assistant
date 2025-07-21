import React, { useContext, useRef, useEffect, useState } from 'react'
import './main.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/context'
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();



const Main = () => {
    const { onSent, recentPrompt, showResult, loading, resultData, setInput, input, jobDescription, setJobDescription, jobDescAttached, setJobDescAttached, jobFileName, setJobFileName } = useContext(Context)
    const resultRef = useRef(null);
    const [resumeText, setResumeText] = useState("");
    const [linkedinText, setLinkedinText] = useState("");

    useEffect(() => {
        const fetchResumeText = async () => {
            const loadResume = pdfjs.getDocument('/resume.pdf');
            const pdf = await loadResume.promise;
            let text = ""
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + "\n";
            }
            setResumeText(text);
        };
        const fetchLinkedinText = async () => {
            const response = await fetch('/linkedin.txt');
            const text = await response.text();
            setLinkedinText(text);
        };
        fetchLinkedinText();
        fetchResumeText();
    }, []);

    useEffect(() => {
        if (resultRef.current) {
            resultRef.current.scrollTop = resultRef.current.scrollHeight;
        }
    }, [resultData, loading]);

    const handleSend = () => {
        if (input.trim()) {
            const prompt = `Sydney's Resume:\n${resumeText}\n\nSydney's LinkedIn:\n${linkedinText}\n\nQuestion: \n${input}\n\nJob Description:\n${jobDescription}`;
            onSent(prompt);
        }
    };

    return (
        <div className="main">
            <div className='nav'>
                <p><span>Sydney Bao's</span></p>
                <p>Personal Chatbot</p>
            </div>
            <div className="main-container">
                {!showResult ?
                    <>
                        <div className="greet">
                            <p><span>Hello, I am Sydney's AI Assistant</span></p>
                            <p>How can I help you today?</p>
                        </div>
                        <div className="cards">
                            <div className="card" onClick={() => setInput("Summarize Sydney's coding experience")}>
                                <p>Summarize Sydney's coding experience</p>
                            </div>
                            <div className="card" onClick={() => setInput("Describe Sydney's ideal work environment")}>
                                <p>Describe Sydney's ideal work environment</p>
                            </div>
                            <div className="card" onClick={() => setInput("Which coding project is Sydney most proud of?")}>
                                <p>Which coding project is Sydney most proud of?</p>
                            </div>
                            <div className="card" onClick={() => setInput("What does Sydney like to do for fun?")}>
                                <p>What does Sydney like to do for fun?</p>
                            </div>
                        </div>
                    </> :
                    <div className='result' ref={resultRef}>
                        <div className="result-title">
                            {recentPrompt}
                        </div>
                        <div className="result-data">
                            <img src={assets.logo} alt="" />
                            {loading ?
                                <div className="loader">
                                    <hr />
                                    <hr />
                                    <hr />
                                </div> :
                                <div>
                                    <p dangerouslySetInnerHTML={{ __html: resultData }}></p>
                                </div>

                            }
                        </div>
                    </div>
                }

                <div className="main-bottom">
                    <div className='bottom-row'>
                        <div className="search-box">
                            <input
                                onChange={(e) => setInput(e.target.value)}
                                value={input}
                                type="text"
                                placeholder='Ask me anything or upload a job description...'
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.metaKey && input.trim()) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            {input ? <img onClick={handleSend} src={assets.send_icon} alt="" /> : null}
                            <label className="custom-file-upload">
                                <input
                                    type="file"
                                    accept=".txt,.pdf"
                                    style={{ display: "none" }}
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        let jobDescText = "";
                                        if (file.type === "application/pdf") {
                                            const pdf = await pdfjs.getDocument(URL.createObjectURL(file)).promise;
                                            for (let i = 1; i <= pdf.numPages; i++) {
                                                const page = await pdf.getPage(i);
                                                const content = await page.getTextContent();
                                                jobDescText += content.items.map(item => item.str).join(' ') + "\n";
                                            }
                                        } else {
                                            jobDescText = await file.text();
                                        }
                                        setJobDescription(jobDescText);
                                        setJobDescAttached(true);
                                        setJobFileName(file.name);
                                        e.target.value = "";
                                    }}
                                />
                                {jobDescAttached && jobFileName ? (
                                    <span
                                        className="job-file-name"
                                        style={{ color: "green", marginLeft: "8px", cursor: "pointer" }}
                                    >
                                        {jobFileName}
                                    </span>
                                ) : (
                                    <span className="upload-tooltip">
                                        <img src={assets.upload_icon} alt="Upload" style={{ width: "24px", height: "24px", verticalAlign: "middle" }} />
                                        <span className="tooltip-text">Upload job description (.pdf or .txt)</span>
                                    </span>
                                )}
                            </label>
                        </div>
                    </div>

                    <div className="bottom-info">
                        <a
                            href="https://github.com/SydneyBao"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="linkedin-link"
                        >
                            <img src={assets.github_icon} alt="GitHub" style={{ width: "24px", height: "24px", verticalAlign: "middle", marginLeft: "6px" }} />
                        </a>
                        <a
                            href="https://www.linkedin.com/in/sydney-bao/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="linkedin-link"
                        >
                            <img src={assets.linkedin_icon} alt="LinkedIn" style={{ width: "24px", height: "24px", verticalAlign: "middle", marginLeft: "6px" }} />
                        </a>
                        <a
                            href="https://sydneybao.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="linkedin-link"
                        >
                            <img src={assets.logo} alt="Sydney Website" style={{ height: "24px", verticalAlign: "middle", marginLeft: "6px" }} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Main