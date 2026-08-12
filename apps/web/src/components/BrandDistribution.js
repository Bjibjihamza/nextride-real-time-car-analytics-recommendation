import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Component for Phase 1: Car Distribution by Brand (Bar Chart)
// Displays a bar chart of car counts by brand, with filters for year range and fuel type
const BrandDistribution = () => {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [yearRange, setYearRange] = useState([2000, 2025]);
  const [fuelType, setFuelType] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Validate year range
      const [min, max] = yearRange;
      if (min > max) {
        setError('Year Min cannot be greater than Year Max');
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/api/cars/brands`, {
          params: {
            yearMin: yearRange[0],
            yearMax: yearRange[1],
            fuelType: fuelType === 'All' ? '' : fuelType.toLowerCase()
          }
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

    // Set dimensions and margins
    const margin = { top: 40, right: 30, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Clear existing SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    // Create SVG container
    const svg = d3
      .select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set scales
    const x = d3
      .scaleBand()
      .domain(data.map(d => d.brand))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .range([height, 0])
      .nice();

    // Add X axis
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px');

    // Add Y axis
    svg
      .append('g')
      .call(d3.axisLeft(y))
      .style('font-size', '12px');

    // Add bars with transition
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
      .attr('fill', '#FFDD67')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill', '#d97706');
        svg
          .append('text')
          .attr('class', 'tooltip')
          .attr('x', x(d.brand) + x.bandwidth() / 2)
          .attr('y', y(d.count) - 10)
          .attr('text-anchor', 'middle')
          .style('font-size', '14px')
          .style('fill', '#333')
          .text(`${d.count} cars (${((d.count / d3.sum(data, d => d.count)) * 100).toFixed(1)}%)`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill', '#FFDD67');
        svg.select('.tooltip').remove();
      })
      .on('click', (event, d) => {
        console.log(`Clicked on ${d.brand}`);
      })
      .transition()
      .duration(800)
      .attr('y', d => y(d.count))
      .attr('height', d => height - y(d.count));

    // Add chart title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Number of Cars by Brand');

    // Add X axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height + 60)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Brand');

    // Add Y axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Number of Cars');
  }, [data, loading, error]);

  return (
    <div className="container py-5">
      <h2 className="text-center fw-bold mb-5">Car Distribution by Brand</h2>
      <div className="mb-4 d-flex justify-content-center align-items-center flex-wrap">
        <div className="me-3 mb-2">
          <label className="me-2">Year Range:</label>
          <input
            type="number"
            value={yearRange[0]}
            onChange={e => setYearRange([+e.target.value, yearRange[1]])}
            className="form-control d-inline-block w-auto me-2"
            min="1900"
            max="2025"
            style={{ width: '100px' }}
          />
          <input
            type="number"
            value={yearRange[1]}
            onChange={e => setYearRange([yearRange[0], +e.target.value])}
            className="form-control d-inline-block w-auto"
            min="1900"
            max="2025"
            style={{ width: '100px' }}
          />
        </div>
        <div className="mb-2">
          <label className="me-2">Fuel Type:</label>
          <select
            value={fuelType}
            onChange={e => setFuelType(e.target.value)}
            className="form-select d-inline-block w-auto"
            style={{ width: '150px' }}
          >
            <option value="All">All</option>
            <option value="essence">Essence</option>
            <option value="diesel">Diesel</option>
            <option value="hybride">Hybride</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : error ? (
        <div className="text-center text-danger">{error}</div>
      ) : (
        <div className="d-flex justify-content-center">
          <svg ref={svgRef}></svg>
        </div>
      )}
      <p className="text-center mt-4 text-muted">
        This chart shows the distribution of cars by brand in our database, filtered by year and fuel type.
      </p>
    </div>
  );
};

export default BrandDistribution;