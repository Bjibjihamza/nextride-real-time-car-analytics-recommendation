import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { carService } from '../../services/api';

const THEME = {
  axis: '#9aa4b5',
  grid: 'rgba(255,255,255,0.06)',
  label: '#eef1f6',
  muted: '#6c7688',
  fuels: { essence: '#f5b301', diesel: '#34d399', hybride: '#38bdf8' },
};

const CarBubbleChart = () => {
  const svgRef = useRef();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);
  const [yearRange, setYearRange] = useState([2000, 2025]);
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [fuelType, setFuelType] = useState('All');
  const [clusterBy, setClusterBy] = useState('none');
  const [width, setWidth] = useState(() => Math.min(920, window.innerWidth - 60));

  useEffect(() => {
    const handleResize = () => setWidth(Math.min(920, window.innerWidth - 60));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        const response = await carService.bubbleChart({
          yearMin: yearRange[0],
          yearMax: yearRange[1],
          maxPrice,
          fuelType: fuelType === 'All' ? '' : fuelType.toLowerCase()
        });
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

    const margin = { top: 40, right: 110, bottom: 70, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([yearRange[0], yearRange[1]]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.popularity) * 1.1]).range([height, 0]).nice();
    const size = d3.scaleSqrt().domain([0, maxPrice || d3.max(data, d => d.price)]).range([5, 30]);
    const color = d3.scaleOrdinal().domain(Object.keys(THEME.fuels)).range(Object.values(THEME.fuels));

    const xAxis = d3.axisBottom(x).tickFormat(d3.format('d'));
    const yAxis = d3.axisLeft(y).ticks(6).tickSize(-innerWidth);

    svg
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', THEME.grid))
      .call(g => g.selectAll('.tick text').style('fill', THEME.axis).style('font-size', '11px'));

    svg
      .append('g')
      .call(yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', THEME.grid))
      .call(g => g.selectAll('.tick text').style('fill', THEME.axis).style('font-size', '11px'));

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
          const fuelCenters = { essence: innerWidth / 3, diesel: innerWidth / 2, hybride: (2 * innerWidth) / 3 };
          return d3.forceX(d => fuelCenters[d.fuel_type]).strength(0.3);
        } else if (clusterBy === 'brand') {
          const brandCenters = [...new Set(data.map(d => d.brand))].reduce((acc, brand, i) => {
            acc[brand] = (innerWidth / (data.length + 1)) * (i + 1);
            return acc;
          }, {});
          return d3.forceX(d => brandCenters[d.brand] || innerWidth / 2).strength(0.3);
        }
        return null;
      })
      .on('tick', ticked);

    const bubbles = svg
      .selectAll('.bubble')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'bubble')
      .attr('r', d => d.r)
      .attr('fill', d => color(d.fuel_type))
      .attr('opacity', 0.72)
      .attr('stroke', 'rgba(255,255,255,0.15)')
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 1).attr('stroke', '#fff');
        svg
          .append('text')
          .attr('class', 'tooltip')
          .attr('x', d.x)
          .attr('y', d.y - d.r - 12)
          .attr('text-anchor', 'middle')
          .style('font-size', '13px')
          .style('font-weight', '700')
          .style('fill', THEME.label)
          .text(`${d.brand}: ${d.price} MAD, ${d.year || 'N/A'}, ${d.fuel_type}`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.72).attr('stroke', 'rgba(255,255,255,0.15)');
        svg.select('.tooltip').remove();
      });

    function ticked() {
      bubbles
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    }

    const legend = svg.append('g').attr('transform', `translate(${innerWidth + 8}, 20)`);
    Object.entries(THEME.fuels).forEach(([fuel, fill], i) => {
      legend.append('circle').attr('cx', 0).attr('cy', i * 22).attr('r', 7).attr('fill', fill);
      legend.append('text').attr('x', 16).attr('y', i * 22 + 5).style('font-size', '12px').style('fill', THEME.axis).text(fuel);
    });

    svg
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -16)
      .attr('text-anchor', 'middle')
      .style('font-size', '15px')
      .style('font-weight', '700')
      .style('fill', THEME.label)
      .text('Car Price Bubble Chart');

    svg
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', height + 48)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', THEME.muted)
      .text('Year');

    svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', THEME.muted)
      .text('Brand Popularity');
  }, [data, loading, error, clusterBy, noDataMessage, width]);

  return (
    <div className="surface p-4" style={{ borderRadius: 22 }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <span className="section-eyebrow">Phase 2 · Interactive</span>
          <h3 className="fw-bold mb-0">Car Price Bubble Chart</h3>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0" style={{ whiteSpace: 'nowrap' }}>Year:</label>
            <input type="number" value={yearRange[0]} onChange={e => setYearRange([+e.target.value, yearRange[1]])} className="form-control" min="1900" max="2025" style={{ width: 82 }} />
            <span style={{ color: 'var(--nr-text-faint)' }}>–</span>
            <input type="number" value={yearRange[1]} onChange={e => setYearRange([yearRange[0], +e.target.value])} className="form-control" min="1900" max="2025" style={{ width: 82 }} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0" style={{ whiteSpace: 'nowrap' }}>Max Price:</label>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(+e.target.value)} className="form-control" min="10000" step="10000" style={{ width: 130 }} />
          </div>
          <div>
            <label className="form-label me-2">Fuel:</label>
            <select value={fuelType} onChange={e => setFuelType(e.target.value)} className="form-select" style={{ width: 130, display: 'inline-block' }}>
              <option value="All">All</option>
              <option value="essence">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="hybride">Hybride</option>
            </select>
          </div>
          <div>
            <label className="form-label me-2">Cluster:</label>
            <select value={clusterBy} onChange={e => setClusterBy(e.target.value)} className="form-select" style={{ width: 140, display: 'inline-block' }}>
              <option value="none">None</option>
              <option value="fuel_type">Fuel Type</option>
              <option value="brand">Brand</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 340 }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-5" style={{ color: 'var(--nr-danger)' }}>{error}</div>
      ) : noDataMessage ? (
        <div className="text-center py-5" style={{ color: 'var(--nr-text-muted)' }}>{noDataMessage}</div>
      ) : (
        <div className="d-flex justify-content-center">
          <svg ref={svgRef} style={{ maxWidth: '100%', height: 'auto' }} />
        </div>
      )}
      <p className="text-center mt-4 mb-0" style={{ color: 'var(--nr-text-faint)', fontSize: '0.88rem' }}>
        This bubble chart shows cars by price (size), fuel type (color), year (x-axis), and brand popularity (y-axis). Use filters to explore and cluster by fuel type or brand.
      </p>
    </div>
  );
};

export default CarBubbleChart;
