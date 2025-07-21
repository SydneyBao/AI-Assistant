import React, { useContext, useRef, useEffect, useState } from 'react'
import './main.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/context'


const Main = () => {
    const { onSent, recentPrompt, showResult, loading, resultData, setInput, input, newChat } = useContext(Context)
    const resultRef = useRef(null);
    const [resumeText, setResumeText] = useState("");

    useEffect(() => {
        const fetchResumeText = async () => {
            const loadResume = pdfjs.getDocument('./resume.pdf');
            const pdf = await loadResume.promise;
            let text = ""
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + "\n";
            }
            setResumeText(text);
        };
        fetchResumeText();
    }, []);

    useEffect(() => {
        if (resultRef.current) {
            resultRef.current.scrollTop = resultRef.current.scrollHeight;
        }
    }, [resultData, loading]);

    const handleSend = () => {
        if (input.trim()) {
            setInput(`Resume:\n${resumeText}\n\nQuestion: \n${input}`);
            onSent();
        }
    };

    return (
        <div className="main">
            <div className='nav'>
                <p><span>Sydney Bao's</span></p>
                <p>Personal Chatbot</p>
                <a
                    href="https://www.linkedin.com/in/sydney-bao/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="linkedin-link"
                >
                    <img src={assets.linkedin_icon} alt="LinkedIn" style={{ height: 24, marginRight: 8 }} />
                </a>
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
                            {/* <img src={assets.user_icon} alt = ""/> */}
                            <p>{recentPrompt}</p>
                        </div>
                        <div className="result-data">
                            <img src="./sign.png" alt="" />
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
                            {/* <p>{resultData}</p> */}
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
                                placeholder='Ask me anything...'
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.metaKey && input.trim()) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            {input ? <img onClick={handleSend} src={assets.send_icon} alt="" /> : null}
                        </div>
                    </div>
                    <p className="bottom-info">
                        This chatbot is powered by the Gemini API
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Main