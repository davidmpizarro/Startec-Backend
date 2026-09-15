import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterBiometricDto } from './dto/register-biometric.dto';
import { BiometricLoginDto } from './dto/biometric-login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register-biometric')
  @HttpCode(HttpStatus.OK)
  registerBiometric(
    @CurrentUser() user: any,
    @Body() registerBiometricDto: RegisterBiometricDto,
  ) {
    return this.authService.registerBiometric(user.id, registerBiometricDto);
  }

  @Post('biometric-login')
  @HttpCode(HttpStatus.OK)
  biometricLogin(@Body() biometricLoginDto: BiometricLoginDto) {
    return this.authService.biometricLogin(biometricLoginDto);
  }
}
