import React, { useState, useEffect } from 'react';
import { fetchSeasonalAnalytics } from '../../data/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { Activity, CloudRain, ShieldAlert, BarChart3, TrendingUp } from 'lucide-react';
import './Analytics.css';

export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchSeasonalAnalytics();
        
        // Transform data into an array of objects for recharts
        const chartData = response.months.map((month, i) => ({
          name: month,
          landslides: response.landslides[i],
          floods: response.floods[i],
          road_blocks: response.road_blocks[i],
          impact_score: response.impact_score[i]
        }));
        
        setData(chartData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading historical data...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error loading data: {error}</div>;

  const totalIncidents = data.reduce((acc, val) => acc + val.landslides + val.floods + val.road_blocks, 0);
  const peakMonth = [...data].sort((a, b) => b.impact_score - a.impact_score)[0].name;
  
  return (
    <div className="analytics-page">
      <header className="page-header">
        <div>
          <h2 className="page-title">Historical Analytics & Trends</h2>
          <p className="page-subtitle">Seasonal disruption patterns across the NER over the last 5 years</p>
        </div>
      </header>

      <div className="analytics-stats-row">
        <div className="analytics-stat glass-panel">
          <Activity size={24} color="var(--accent-primary)" />
          <div>
            <div className="stat-label">Total Annual Incidents</div>
            <div className="stat-value text-glow">{totalIncidents}</div>
          </div>
        </div>
        <div className="analytics-stat glass-panel">
          <TrendingUp size={24} color="var(--risk-high)" />
          <div>
            <div className="stat-label">Peak Risk Month</div>
            <div className="stat-value" style={{ color: 'var(--risk-high)' }}>{peakMonth}</div>
          </div>
        </div>
        <div className="analytics-stat glass-panel">
          <CloudRain size={24} color="#3b82f6" />
          <div>
            <div className="stat-label">Monsoon Multiplier</div>
            <div className="stat-value" style={{ color: '#3b82f6' }}>4.5x</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-panel glass-panel">
          <h3>
            <ShieldAlert size={18} /> Seasonal Disruption Volume (Incidents)
          </h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLandslides" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFloods" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Legend />
                <Area type="monotone" dataKey="landslides" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLandslides)" name="Landslides" />
                <Area type="monotone" dataKey="floods" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFloods)" name="Floods" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-panel glass-panel">
          <h3>
            <BarChart3 size={18} /> Road Network Impact Score
          </h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff' }} cursor={{fill: '#222'}} />
                <Legend />
                <Bar dataKey="impact_score" fill="var(--risk-high)" name="Impact Severity (1-10)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
