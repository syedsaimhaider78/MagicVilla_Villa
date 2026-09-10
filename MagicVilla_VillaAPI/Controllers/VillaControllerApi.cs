using MagicVilla_VillaAPI.Data;
using MagicVilla_VillaAPI.DTO;
using MagicVilla_VillaAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MagicVilla_VillaAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VillaApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<VillaApiController> _logger;

        public VillaApiController(ApplicationDbContext context, ILogger<VillaApiController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET All with category / propertyType and search filtering
        [AllowAnonymous]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<VillaDto>>> GetVillas(
            [FromQuery] string? category = null,
            [FromQuery] string? propertyType = null,
            [FromQuery] string? search = null)
        {
            var filter = !string.IsNullOrWhiteSpace(category) ? category.Trim() : (!string.IsNullOrWhiteSpace(propertyType) ? propertyType.Trim() : null);
            _logger.LogInformation("Fetching villas. Filter category: {Filter}, search: {Search}", filter ?? "All", search ?? "None");

            var query = _context.Villas.AsQueryable();

            // 1. Category filter
            if (!string.IsNullOrWhiteSpace(filter) && !string.Equals(filter, "All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(v => v.PropertyType.ToLower() == filter.ToLower() ||
                                         (filter.ToLower() == "villa" && (v.PropertyType == null || v.PropertyType == "")));
            }

            // 2. Search filter against Name and Details / Description / Amenities using Contains
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(v => v.Name.Contains(term) ||
                                         (v.Description != null && v.Description.Contains(term)) ||
                                         (v.Amenities != null && v.Amenities.Contains(term)));
            }

            var villas = await query.ToListAsync();
            return Ok(villas);
        }

        // GET Single
        [AllowAnonymous]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<VillaDto>> GetVilla(int id)
        {
            _logger.LogInformation("Getting villa: {VillaId}", id);
            var villa = await _context.Villas.FindAsync(id);

            if (villa == null)
            {
                _logger.LogWarning("Villa not found: {VillaId}", id);
                return NotFound();
            }

            return Ok(villa);
        }

        // POST Create
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult> CreateVilla([FromBody] VillaDto villaDto)
        {
            if (villaDto == null)
            {
                return BadRequest("Villa cannot be null");
            }

            var villa = new Villa
            {
                Name = villaDto.Name,
                Occupancy = villaDto.Occupancy,
                Sqft = villaDto.Sqft,
                Price = villaDto.Price,
                Description = villaDto.Description,
                ImageUrl = villaDto.ImageUrl,
                Amenities = villaDto.Amenities,
                PropertyType = !string.IsNullOrWhiteSpace(villaDto.PropertyType) ? villaDto.PropertyType.Trim() : "Villa",
                CreatedDate = DateTime.Now
            };

            await _context.Villas.AddAsync(villa);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetVilla), new { id = villa.Id }, villa);
        }

        // PUT Update
        [Authorize(Roles = "Admin")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateVilla(int id, [FromBody] VillaDto villaDto)
        {
            if (villaDto == null || id == 0)
            {
                return BadRequest();
            }

            var villa = await _context.Villas.FindAsync(id);
            if (villa == null)
            {
                return NotFound();
            }

            villa.Name = villaDto.Name;
            villa.Occupancy = villaDto.Occupancy;
            villa.Sqft = villaDto.Sqft;
            villa.Price = villaDto.Price;
            villa.Description = villaDto.Description;
            villa.ImageUrl = villaDto.ImageUrl;
            villa.Amenities = villaDto.Amenities;
            if (!string.IsNullOrWhiteSpace(villaDto.PropertyType))
            {
                villa.PropertyType = villaDto.PropertyType.Trim();
            }
            villa.UpdatedDate = DateTime.Now;

            _context.Villas.Update(villa);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteVilla(int id)
        {
            if (id == 0)
            {
                return BadRequest();
            }

            var villa = await _context.Villas.FindAsync(id);
            if (villa == null)
            {
                return NotFound();
            }

            _context.Villas.Remove(villa);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}