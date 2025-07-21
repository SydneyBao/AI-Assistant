import { createContext, useState } from "react";
import run from "../config/gemini";

export const Context = createContext();

const ContextProvider = (props) => {
    const [input, setInput] = useState("");
    const [recentPrompt, setRecentPrompt] = useState("");
    const [prevPrompts, setPrevPrompts] = useState([]);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [jobDescAttached, setJobDescAttached] = useState(false);
    const [jobFileName, setJobFileName] = useState("");

    const delay = (index, nextWord) => {
        setTimeout(function () {
            setResultData(prev => prev + nextWord);
        }, 75 * index)
    }

    const newChat = () => {
        setLoading(false)
        setShowResult(false)
    }

    const onSent = async (prompt) => {
        setJobDescription("");
        setJobDescAttached(false);
        setJobFileName("");
        setInput("");
        setResultData("");
        setLoading(true);
        setShowResult(true);

        if (jobDescAttached && jobFileName) {
            setRecentPrompt(
                <>
                    <div>{input}</div>
                    <div style={{ fontSize: "0.85em", color: "#555", marginTop: "2px" }}>
                        ({jobFileName} attached)
                    </div>
                </>
            );
        } else {
            setRecentPrompt(input);
        }

        const response = await run(prompt);

        let newResponse = response.replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/(?<!<br>)\*\s/g, '<br>')
            .replace(/<br>\*\s/g, '<br>')
            .replace(/##(.*?)(<br>|$)/g, '<u>$1</u>$2')
            .split(" ");

        for (let i = 0; i < newResponse.length; i++) {
            const nextWord = newResponse[i];
            delay(i, nextWord + " ");
        }

        setLoading(false);
    };
    const contextValue = {
        prevPrompts,
        setPrevPrompts,
        onSent,
        setRecentPrompt,
        recentPrompt,
        showResult,
        loading,
        resultData,
        input,
        setInput,
        newChat,
        jobDescription,
        setJobDescription,
        jobDescAttached,
        setJobDescAttached,
        jobFileName,
        setJobFileName,
    }
    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    )
}

export default ContextProvider;