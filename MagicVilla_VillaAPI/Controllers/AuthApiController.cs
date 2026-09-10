using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MagicVilla_VillaAPI.Data;
using MagicVilla_VillaAPI.DTO;
using MagicVilla_VillaAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace MagicVilla_VillaAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthApiController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public AuthApiController(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
            {
                return BadRequest(new { message = "Email already registered." });
            }

            // Security: All public registrations are strictly assigned the Customer role
            var user = new User
            {
                Name = dto.Name,
                Email = dto.Email.ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "Customer"
            };

            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Registration successful." });
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto dto)
        {
            var normalizedEmail = dto.Email?.Trim().ToLower() ?? string.Empty;

            // 1. Hardcoded Admin Authentication
            if (normalizedEmail == "admin@magicvilla.com" && (dto.Password == "Admin@123" || dto.Password == "Saim@4646"))
            {
                var adminTokenHandler = new JwtSecurityTokenHandler();
                var adminKey = Encoding.ASCII.GetBytes(_config["Jwt:Key"] ?? "MagicVillaUltraSecretSecurityKey2026ForAuthenticationApiSystem!");

                var adminTokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "1"),
                        new Claim(ClaimTypes.Name, "MagicVilla Admin"),
                        new Claim(ClaimTypes.Email, "admin@magicvilla.com"),
                        new Claim(ClaimTypes.Role, "Admin"),
                        new Claim("role", "Admin")
                    }),
                    Expires = DateTime.UtcNow.AddDays(7),
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(adminKey), SecurityAlgorithms.HmacSha256Signature)
                };

                var adminToken = adminTokenHandler.CreateToken(adminTokenDescriptor);

                return Ok(new LoginResponseDto
                {
                    Token = adminTokenHandler.WriteToken(adminToken),
                    Name = "MagicVilla Admin",
                    Email = "admin@magicvilla.com",
                    Role = "Admin"
                });
            }

            // 2. Database-backed User Authentication
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            bool isPasswordValid = false;
            try
            {
                isPasswordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
            }
            catch
            {
                isPasswordValid = false;
            }

            if (!isPasswordValid && user.PasswordHash == dto.Password)
            {
                isPasswordValid = true;
            }

            if (!isPasswordValid)
            {
                return Unauthorized(new { message = "Invalid email or password." });
            }

            var userRole = string.Equals(user.Role, "Admin", StringComparison.OrdinalIgnoreCase) ? "Admin" : "Customer";

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_config["Jwt:Key"] ?? "MagicVillaUltraSecretSecurityKey2026ForAuthenticationApiSystem!");

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name, user.Name),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, userRole),
                    new Claim("role", userRole)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return Ok(new LoginResponseDto
            {
                Token = tokenHandler.WriteToken(token),
                Name = user.Name,
                Email = user.Email,
                Role = userRole
            });
        }
    }
}