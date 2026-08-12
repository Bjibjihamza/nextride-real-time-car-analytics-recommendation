import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Component for Phase 2: Interactive Bubble Chart for Car Data
// Displays cars as bubbles sized by price, colored by fuel type, positioned by year and brand popularity
const CarBubbleChart = () => {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);
  const [yearRange, setYearRange] = useState([2000, 2025]);
  const [maxPrice, setMaxPrice] = useState(1000000); // Default: 1M MAD
  const [fuelType, setFuelType] = useState('All');
  const [clusterBy, setClusterBy] = useState('none'); // Clustering: none, fuel_type, brand

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setNoDataMessage(null);
      const [min, max] = yearRange;
      if (min > max) {
        setError('Year Min cannot be greater than Year Max');
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/api/cars/bubbles`, {
          params: {
            yearMin: yearRange[0],
            yearMax: yearRange[1],
            maxPrice,
            fuelType: fuelType === 'All' ? '' : fuelType.toLowerCase()
          }
        });
        console.log('API response:', response.data);
        if (response.data.data.length === 0 && response.data.message) {
          setNoDataMessage(response.data.message);
          setData([]);
        } else {
          setData(response.data.data);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [yearRange, maxPrice, fuelType]);

  useEffect(() => {
    if (noDataMessage) return;
    if (!data.length && !loading && !error) {
      setError('No data available for the selected filters');
      return;
    }
    if (!data.length || loading) return;

    // Set dimensions and margins
    const margin = { top: 40, right: 100, bottom: 70, left: 60 };
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
      .scaleLinear()
      .domain([yearRange[0], yearRange[1]])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.popularity) * 1.1])
      .range([height, 0])
      .nice();

    const size = d3
      .scaleSqrt()
      .domain([0, maxPrice || d3.max(data, d => d.price)])
      .range([5, 30]);

    const color = d3.scaleOrdinal()
      .domain(['essence', 'diesel', 'hybride'])
      .range(['#FFDD67', '#4CAF50', '#2196F3']);

    // Add X axis
    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')))
      .style('font-size', '12px');

    // Add Y axis
    svg
      .append('g')
      .call(d3.axisLeft(y))
      .style('font-size', '12px');

    // Prepare force simulation
    const nodes = data.map(d => ({
      ...d,
      x: x(d.year || yearRange[0]),
      y: y(d.popularity),
      r: size(d.price)
    }));

    const simulation = d3
      .forceSimulation(nodes)
      .force('x', d3.forceX(d => x(d.year || yearRange[0])).strength(0.5))
      .force('y', d3.forceY(d => y(d.popularity)).strength(0.5))
      .force('collide', d3.forceCollide(d => d.r + 2))
      .force('cluster', () => {
        if (clusterBy === 'fuel_type') {
          const fuelCenters = { essence: width / 3, diesel: width / 2, hybride: (2 * width) / 3 };
          return d3.forceX(d => fuelCenters[d.fuel_type]).strength(0.3);
        } else if (clusterBy === 'brand') {
          const brandCenters = [...new Set(data.map(d => d.brand))].reduce((acc, brand, i) => {
            acc[brand] = (width / (data.length + 1)) * (i + 1);
            return acc;
          }, {});
          return d3.forceX(d => brandCenters[d.brand] || width / 2).strength(0.3);
        }
        return null;
      })
      .on('tick', ticked);

    // Add bubbles
    const bubbles = svg
      .selectAll('.bubble')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'bubble')
      .attr('r', d => d.r)
      .attr('fill', d => color(d.fuel_type))
      .attr('opacity', 0.7)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1);
        svg
          .append('text')
          .attr('class', 'tooltip')
          .attr('x', d.x)
          .attr('y', d.y - d.r - 10)
          .attr('text-anchor', 'middle')
          .style('font-size', '14px')
          .style('fill', '#333')
          .text(`${d.brand}: ${d.price} MAD, ${d.year || 'N/A'}, ${d.fuel_type}`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.7);
        svg.select('.tooltip').remove();
      })
      .on('click', (event, d) => {
        console.log(`Clicked: ${d.brand}, ${d.price} MAD, ${d.year}, ${d.fuel_type}`);
      });

    function ticked() {
      bubbles
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    }

    // Add legend
    const legend = svg
      .append('g')
      .attr('transform', `translate(${width - 80}, 20)`);

    ['essence', 'diesel', 'hybride'].forEach((fuel, i) => {
      legend
        .append('circle')
        .attr('cx', 0)
        .attr('cy', i * 20)
        .attr('r', 7)
        .attr('fill', color(fuel));
      legend
        .append('text')
        .attr('x', 15)
        .attr('y', i * 20 + 5)
        .style('font-size', '12px')
        .text(fuel);
    });

    // Add chart title
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .text('Car Price Bubble Chart');

    // Add X axis label
    svg
      .append('text')
      .attr('x', width / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Year');

    // Add Y axis label
    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -40)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Brand Popularity');
  }, [data, loading, error, clusterBy, noDataMessage]);

  return (
    <div className="container py-5">
      <h2 className="text-center fw-bold mb-5">Car Price Bubble Chart</h2>
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
        <div className="me-3 mb-2">
          <label className="me-2">Max Price (MAD):</label>
          <input
            type="number"
            value={maxPrice}
            onChange={e => setMaxPrice(+e.target.value)}
            className="form-control d-inline-block w-auto"
            min="10000"
            step="10000"
            style={{ width: '150px' }}
          />
        </div>
        <div className="me-3 mb-2">
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
        <div className="mb-2">
          <label className="me-2">Cluster By:</label>
          <select
            value={clusterBy}
            onChange={e => setClusterBy(e.target.value)}
            className="form-select d-inline-block w-auto"
            style={{ width: '150px' }}
          >
            <option value="none">None</option>
            <option value="fuel_type">Fuel Type</option>
            <option value="brand">Brand</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : error ? (
        <div className="text-center text-danger">{error}</div>
      ) : noDataMessage ? (
        <div className="text-center text-muted">{noDataMessage}</div>
      ) : (
        <div className="d-flex justify-content-center">
          <svg ref={svgRef}></svg>
        </div>
      )}
      <p className="text-center mt-4 text-muted">
        This bubble chart shows cars by price (size), fuel type (color), year (x-axis), and brand popularity (y-axis). Use filters to explore and cluster by fuel type or brand.
      </p>
    </div>
  );
};

export default CarBubbleChart;