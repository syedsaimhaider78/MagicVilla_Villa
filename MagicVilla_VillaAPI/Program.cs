using Hangfire;
using Hangfire.SqlServer;
using MagicVilla_VillaAPI.Data;
using MagicVilla_VillaAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. Database Connection
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// 2. Hangfire Setup
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_170)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
    {
        CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
        QueuePollInterval = TimeSpan.Zero,
        UseRecommendedIsolationLevel = true,
        DisableGlobalLocks = true
    }));

// Background jobs execute karne wala engine (Crucial)
builder.Services.AddHangfireServer();

// 3. Application Services
builder.Services.AddScoped<IBookingAutomationService, BookingAutomationService>();
builder.Services.AddScoped<IEmailNotificationService, EmailNotificationService>();

// 4. JWT Authentication Setup
var jwtKey = builder.Configuration["Jwt:Key"] ?? "MagicVillaUltraSecretSecurityKey2026ForAuthenticationApiSystem!";
var keyBytes = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

builder.Services.AddAuthorization();


builder.Services.AddSignalR();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 5. CORS Setup
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseHangfireDashboard("/hangfire");


RecurringJob.AddOrUpdate<IBookingAutomationService>(
    "daily-booking-status-sync",
    service => service.SyncCompletedBookingsAsync(),
    Cron.MinuteInterval(10));

RecurringJob.AddOrUpdate<IEmailNotificationService>(
    "periodic-villa-summary-report",
    service => service.SendPeriodicSummaryReportAsync(),
    Cron.MinuteInterval(10));

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<MagicVilla_VillaAPI.Hubs.NotificationHub>("/hubs/notifications");
app.MapHub<MagicVilla_VillaAPI.Hubs.ChatHub>("/Chat");

app.Run();