import React from 'react';

const getRange = (page, totalPages, maxPagesToShow = 9) => {
  let start = Math.max(1, page - Math.floor(maxPagesToShow / 2));
  let end = Math.min(totalPages, start + maxPagesToShow - 1);
  if (end === totalPages) {
    start = Math.max(1, end - maxPagesToShow + 1);
  }
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return { pages, showLeftEllipsis: start > 1, showRightEllipsis: end < totalPages };
};

const Pagination = ({ page, totalPages, onPageChange, className = '' }) => {
  if (totalPages <= 1) return null;
  const { pages, showLeftEllipsis, showRightEllipsis } = getRange(page, totalPages);

  return (
    <div className={`d-flex justify-content-center ${className}`}>
      <nav aria-label="Page navigation">
        <ul className="pagination mb-0">
          <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(page - 1)}>
              Previous
            </button>
          </li>

          {showLeftEllipsis && (
            <>
              <li className="page-item">
                <button className="page-link" onClick={() => onPageChange(1)}>1</button>
              </li>
              <li className="page-item disabled">
                <span className="page-link">...</span>
              </li>
            </>
          )}

          {pages.map((pageNumber) => (
            <li key={pageNumber} className={`page-item ${page === pageNumber ? 'active' : ''}`}>
              <button className="page-link" onClick={() => onPageChange(pageNumber)}>
                {pageNumber}
              </button>
            </li>
          ))}

          {showRightEllipsis && (
            <>
              <li className="page-item disabled">
                <span className="page-link">...</span>
              </li>
              <li className="page-item">
                <button className="page-link" onClick={() => onPageChange(totalPages)}>
                  {totalPages}
                </button>
              </li>
            </>
          )}

          <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(page + 1)}>
              Next
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Pagination;
