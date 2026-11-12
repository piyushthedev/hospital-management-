package com.hospital.management.controller;

import com.hospital.management.entity.Patient;
import com.hospital.management.repository.PatientRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
@CrossOrigin(origins = "*")
public class PatientController {

    private final PatientRepository repository;

    public PatientController(PatientRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Patient> getAllPatients() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public Patient getPatient(@PathVariable Long id) {
        return repository.findById(id).orElseThrow();
    }

    @PostMapping
    public Patient addPatient(@RequestBody Patient patient) {
        return repository.save(patient);
    }

    @PutMapping("/{id}")
    public Patient updatePatient(@PathVariable Long id,
                                 @RequestBody Patient updatedPatient) {
        Patient patient = repository.findById(id).orElseThrow();

        patient.setName(updatedPatient.getName());
        patient.setAge(updatedPatient.getAge());
        patient.setGender(updatedPatient.getGender());
        patient.setPhone(updatedPatient.getPhone());
        patient.setAddress(updatedPatient.getAddress());

        return repository.save(patient);
    }

    @DeleteMapping("/{id}")
    public void deletePatient(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
