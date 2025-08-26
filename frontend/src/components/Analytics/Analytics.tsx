import React, { useEffect, useState } from 'react';
import './Analytics.css';

const Analytics = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        fetch('/api/analytics')
            .then(response => response.json())
            .then(data => setData(data))
            .catch(error => console.error('Error fetching analytics:', error));
    }, []);

    return (
        <div className="analytics">
            <h2>Analytics Dashboard</h2>
            <div className="charts">
                {data.map((chartData, index) => (
                    <div key={index} className="chart">
                        <h3>{chartData.title}</h3>
                        {/* Render chart with chartData values */}
                        <p>{chartData.value}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Analytics;
