package com.hospital.management.controller;

import com.hospital.management.entity.Doctor;
import com.hospital.management.repository.DoctorRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@CrossOrigin(origins = "*")
public class DoctorController {

    private final DoctorRepository repository;

    public DoctorController(DoctorRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Doctor> getAllDoctors() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public Doctor getDoctor(@PathVariable Long id) {
        return repository.findById(id).orElseThrow();
    }

    @PostMapping
    public Doctor addDoctor(@RequestBody Doctor doctor) {
        return repository.save(doctor);
    }

    @PutMapping("/{id}")
    public Doctor updateDoctor(@PathVariable Long id,
                               @RequestBody Doctor updatedDoctor) {
        Doctor doctor = repository.findById(id).orElseThrow();

        doctor.setName(updatedDoctor.getName());
        doctor.setSpecialization(updatedDoctor.getSpecialization());
        doctor.setPhone(updatedDoctor.getPhone());
        doctor.setEmail(updatedDoctor.getEmail());
        doctor.setConsultationFee(updatedDoctor.getConsultationFee());

        return repository.save(doctor);
    }

    @DeleteMapping("/{id}")
    public void deleteDoctor(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
