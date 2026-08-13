import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { carService } from '../../services/api';

const THEME = {
  axis: '#9aa4b5',
  grid: 'rgba(255,255,255,0.06)',
  bar: '#f5b301',
  barHover: '#ffc937',
  label: '#eef1f6',
  muted: '#6c7688',
};

const BrandDistribution = () => {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [yearRange, setYearRange] = useState([2000, 2025]);
  const [fuelType, setFuelType] = useState('All');
  const [width, setWidth] = useState(() => Math.min(880, window.innerWidth - 60));

  useEffect(() => {
    const handleResize = () => setWidth(Math.min(880, window.innerWidth - 60));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [min, max] = yearRange;
      if (min > max) {
        setError('Year Min cannot be greater than Year Max');
        setLoading(false);
        return;
      }
      try {
        const response = await carService.brandDistribution({
          yearMin: yearRange[0],
          yearMax: yearRange[1],
          fuelType: fuelType === 'All' ? '' : fuelType.toLowerCase()
        });
        setData(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [yearRange, fuelType]);

  useEffect(() => {
    if (!data.length && !loading && !error) {
      setError('No data available for the selected filters');
      return;
    }
    if (!data.length || loading) return;

    const margin = { top: 40, right: 30, bottom: 80, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const height = 460 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(data.map(d => d.brand))
      .range([0, innerWidth])
      .padding(0.25);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .range([height, 0])
      .nice();

    const xAxis = d3.axisBottom(x).tickSize(0);
    const yAxis = d3.axisLeft(y).ticks(6).tickSize(-innerWidth);

    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-38)')
      .attr('text-anchor', 'end')
      .attr('dx', '-6px')
      .attr('dy', '8px')
      .style('fill', THEME.axis)
      .style('font-size', '11px');

    svg
      .append('g')
      .call(yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', THEME.grid))
      .call(g => g.selectAll('.tick text').style('fill', THEME.axis).style('font-size', '11px'));

    const gradient = svg
      .append('defs')
      .append('linearGradient')
      .attr('id', 'bar-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    gradient.append('stop').attr('offset', '0%').attr('stop-color', THEME.barHover);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', THEME.bar);

    svg
      .selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.brand))
      .attr('y', height)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('rx', 6)
      .attr('fill', 'url(#bar-gradient)')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.9);
        svg
          .append('text')
          .attr('class', 'tooltip')
          .attr('x', x(d.brand) + x.bandwidth() / 2)
          .attr('y', y(d.count) - 10)
          .attr('text-anchor', 'middle')
          .style('font-size', '13px')
          .style('font-weight', '700')
          .style('fill', THEME.label)
          .text(`${d.count} cars (${((d.count / d3.sum(data, d => d.count)) * 100).toFixed(1)}%)`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        svg.select('.tooltip').remove();
      })
      .transition()
      .duration(800)
      .attr('y', d => y(d.count))
      .attr('height', d => height - y(d.count));

    svg
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -16)
      .attr('text-anchor', 'middle')
      .style('font-size', '15px')
      .style('font-weight', '700')
      .style('fill', THEME.label)
      .text('Number of Cars by Brand');

    svg
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', height + 68)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', THEME.muted)
      .text('Brand');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', THEME.muted)
      .text('Number of Cars');
  }, [data, loading, error, width]);

  return (
    <div className="surface p-4" style={{ borderRadius: 22 }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <span className="section-eyebrow">Phase 1 · Distribution</span>
          <h3 className="fw-bold mb-0">Car Distribution by Brand</h3>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0" style={{ whiteSpace: 'nowrap' }}>Year Range:</label>
            <input type="number" value={yearRange[0]} onChange={e => setYearRange([+e.target.value, yearRange[1]])} className="form-control" min="1900" max="2025" style={{ width: 90 }} />
            <span style={{ color: 'var(--nr-text-faint)' }}>–</span>
            <input type="number" value={yearRange[1]} onChange={e => setYearRange([yearRange[0], +e.target.value])} className="form-control" min="1900" max="2025" style={{ width: 90 }} />
          </div>
          <div>
            <label className="form-label me-2">Fuel Type:</label>
            <select value={fuelType} onChange={e => setFuelType(e.target.value)} className="form-select" style={{ width: 140, display: 'inline-block' }}>
              <option value="All">All</option>
              <option value="essence">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="hybride">Hybride</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 320 }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-5" style={{ color: 'var(--nr-danger)' }}>{error}</div>
      ) : (
        <div className="d-flex justify-content-center">
          <svg ref={svgRef} style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
      )}
      <p className="text-center mt-4 mb-0" style={{ color: 'var(--nr-text-faint)', fontSize: '0.88rem' }}>
        This chart shows the distribution of cars by brand in our database, filtered by year and fuel type.
      </p>
    </div>
  );
};

export default BrandDistribution;
